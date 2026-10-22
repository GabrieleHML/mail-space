const labelRepository = require('../repositories/labelRepository');
const labelService = require('../services/labelService');
const HttpError = require('../utils/httpError');
const validate = require('../utils/validation');

async function get(req, res) {
  res.json(await labelRepository.get(req.user.email));
}

// PUT /api/labels { labels: [...] } — replaces the whole set of labels
async function update(req, res) {
  if (!Array.isArray(req.body.labels)) {
    throw new HttpError(400, 'labels must be an array');
  }
  const labels = validate.labels(req.body.labels);
  res.json(await labelService.update(req.user.email, labels));
}

module.exports = { get, update };
