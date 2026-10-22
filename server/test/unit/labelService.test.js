jest.mock('../../src/services/classifierService');
jest.mock('../../src/repositories/emailRepository');
jest.mock('../../src/repositories/labelRepository');

const classifierService = require('../../src/services/classifierService');
const emailRepository = require('../../src/repositories/emailRepository');
const labelRepository = require('../../src/repositories/labelRepository');
const labelService = require('../../src/services/labelService');

const USER = 'alice@example.com';
const emails = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, body: `e-mail ${i + 1}` }));

beforeEach(() => {
  labelRepository.get.mockResolvedValue(['Viaggi', 'Lavoro']);
  emailRepository.search.mockResolvedValue(emails(3));
});

describe('update', () => {
  it('saves the labels and removes the deleted ones from the e-mails', async () => {
    const result = await labelService.update(USER, ['Viaggi']);

    expect(labelRepository.set).toHaveBeenCalledWith(USER, ['Viaggi']);
    expect(emailRepository.removeLabelsFromAll).toHaveBeenCalledWith(USER, ['Lavoro']);
    expect(result).toEqual({ labels: ['Viaggi'], added: [], removed: ['Lavoro'], failed: 0 });
    // Nothing new to look for: Gemini is not called
    expect(classifierService.classifyEmail).not.toHaveBeenCalled();
  });

  it('asks Gemini about the new labels and adds only those', async () => {
    classifierService.classifyEmail.mockResolvedValue(['Viaggi', 'Spesa']);

    await labelService.update(USER, ['Viaggi', 'Lavoro', 'Spesa']);

    expect(classifierService.classifyEmail).toHaveBeenCalledTimes(3);
    expect(emailRepository.addLabels).toHaveBeenCalledWith(USER, 1, ['Spesa']);
    expect(emailRepository.addLabels).toHaveBeenCalledTimes(3);
  });

  it('counts the e-mails that could not be re-classified', async () => {
    classifierService.classifyEmail
      .mockResolvedValueOnce(['Spesa'])
      .mockRejectedValueOnce(new Error('Gemini down'))
      .mockResolvedValueOnce([]);

    const result = await labelService.update(USER, ['Viaggi', 'Lavoro', 'Spesa']);

    expect(result.failed).toBe(1);
    expect(emailRepository.addLabels).toHaveBeenCalledTimes(1);
  });

  it('never sends more than 5 requests to Gemini at the same time', async () => {
    emailRepository.search.mockResolvedValue(emails(20));
    let inFlight = 0;
    let maxInFlight = 0;
    classifierService.classifyEmail.mockImplementation(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return [];
    });

    await labelService.update(USER, ['Viaggi', 'Lavoro', 'Spesa']);

    expect(classifierService.classifyEmail).toHaveBeenCalledTimes(20);
    expect(maxInFlight).toBe(5);
  });
});
