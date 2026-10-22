const emailRepository = require('../repositories/emailRepository');
const emailService = require('../services/emailService');
const HttpError = require('../utils/httpError');
const validate = require('../utils/validation');

// GET /api/emails?q=&sender=&subject=&words=a,b&labels=x&labels=y&match=all|any
async function list(req, res) {
  const query = req.query;
  const words = validate.text(query.words, 'words', { maxLength: 500 });
  const filters = {
    text: validate.text(query.q, 'q', { maxLength: 200 }),
    sender: validate.text(query.sender, 'sender', { maxLength: 200 }),
    subject: validate.text(query.subject, 'subject', { maxLength: 200 }),
    words: words
      .split(',')
      .map((word) => word.trim())
      .filter(Boolean),
    labels: validate.labels(query.labels),
    matchAll: query.match === 'all',
  };
  res.json(await emailRepository.search(req.user.email, filters));
}

// POST /api/emails — e-mail typed in the form
async function create(req, res) {
  const email = await emailService.store(req.user.email, {
    sender: validate.text(req.body.sender, 'sender', { maxLength: 1000 }),
    subject: validate.text(req.body.subject, 'subject', { maxLength: 1000 }),
    body: validate.text(req.body.body, 'body', { required: true }),
  });
  res.status(201).json(email);
}

// POST /api/emails/upload — multipart form with a .eml file in the "file" field
async function upload(req, res) {
  if (!req.file) {
    throw new HttpError(400, 'A .eml file is required in the "file" field');
  }
  const parsed = await emailService.parseEml(req.file.buffer);
  res.status(201).json(await emailService.store(req.user.email, parsed));
}

// DELETE /api/emails { ids: [...] }
async function remove(req, res) {
  const ids = validate.idList(req.body.ids);
  const deleted = await emailRepository.deleteMany(req.user.email, ids);
  if (deleted === 0) {
    throw new HttpError(404, 'No e-mail found');
  }
  res.sendStatus(204);
}

module.exports = { list, create, upload, remove };
