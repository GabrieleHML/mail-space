// Validation of request input: every helper returns the normalized value or
// throws a 400 HttpError, so controllers can use the result directly.
const HttpError = require('./httpError');

const MAX_LABELS = 50;
const MAX_LABEL_LENGTH = 50;

function id(value, name = 'id') {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, `${name} must be a positive integer`);
  }
  return parsed;
}

function idList(value, name = 'ids') {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, `${name} must be a non-empty array of ids`);
  }
  return value.map((item) => id(item, name));
}

function text(value, name, { required = false, maxLength = Infinity } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${name} is required`);
    return '';
  }
  if (typeof value !== 'string') {
    throw new HttpError(400, `${name} must be a string`);
  }
  if (required && value.trim() === '') {
    throw new HttpError(400, `${name} is required`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, `${name} must be at most ${maxLength} characters`);
  }
  return value;
}

// Returns the trimmed, de-duplicated list of labels
function labels(value, name = 'labels') {
  const list = value === undefined ? [] : [].concat(value);
  if (list.length > MAX_LABELS || !list.every((label) => typeof label === 'string')) {
    throw new HttpError(400, `${name} must be a list of at most ${MAX_LABELS} strings`);
  }
  const trimmed = list.map((label) => label.trim());
  if (trimmed.some((label) => label === '' || label.length > MAX_LABEL_LENGTH)) {
    throw new HttpError(400, `each label must be 1-${MAX_LABEL_LENGTH} characters long`);
  }
  return [...new Set(trimmed)];
}

module.exports = { id, idList, text, labels };
