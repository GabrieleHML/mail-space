const fs = require('node:fs');
const path = require('node:path');

jest.mock('../../src/services/classifierService');
jest.mock('../../src/repositories/emailRepository');
jest.mock('../../src/repositories/labelRepository');

const classifierService = require('../../src/services/classifierService');
const emailRepository = require('../../src/repositories/emailRepository');
const labelRepository = require('../../src/repositories/labelRepository');
const emailService = require('../../src/services/emailService');

const fixture = (name) => fs.readFileSync(path.join(__dirname, '../fixtures', name));

describe('parseEml', () => {
  it('extracts sender address, subject and text', async () => {
    const email = await emailService.parseEml(fixture('viaggio-roma.eml'));

    expect(email.sender).toBe('marco.rinaldi@example.com');
    expect(email.subject).toBe('Viaggio a Roma - dettagli e organizzazione');
    expect(email.body).toContain('Trastevere');
  });

  it('rejects e-mails without text content', async () => {
    await expect(emailService.parseEml(fixture('no-text.eml'))).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('store', () => {
  beforeEach(() => {
    labelRepository.get.mockResolvedValue(['Viaggi', 'Lavoro']);
    emailRepository.insert.mockImplementation(async (userEmail, email) => ({ id: 1, ...email }));
  });

  it('saves the e-mail with the labels chosen by the classifier', async () => {
    classifierService.classifyEmail.mockResolvedValue(['Viaggi']);

    const email = await emailService.store('alice@example.com', {
      sender: 's@example.com',
      subject: 'Roma',
      body: 'Treno',
    });

    expect(email).toMatchObject({ labels: ['Viaggi'], classified: true });
    expect(classifierService.classifyEmail).toHaveBeenCalledWith('Treno', ['Viaggi', 'Lavoro']);
  });

  it('saves the e-mail without labels when Gemini is unavailable', async () => {
    classifierService.classifyEmail.mockRejectedValue(new Error('Gemini down'));

    const email = await emailService.store('alice@example.com', { body: 'Treno' });

    expect(email).toMatchObject({ labels: [], classified: false });
    expect(emailRepository.insert).toHaveBeenCalled();
  });

  it('truncates sender and subject to the database column size', async () => {
    classifierService.classifyEmail.mockResolvedValue([]);

    await emailService.store('alice@example.com', {
      sender: 's'.repeat(300),
      subject: 'x'.repeat(300),
      body: 'b',
    });

    const saved = emailRepository.insert.mock.calls[0][1];
    expect(saved.sender).toHaveLength(255);
    expect(saved.subject).toHaveLength(255);
  });
});
