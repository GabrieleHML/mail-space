// Business logic for storing e-mails: parsing .eml files and AI tagging.
const { simpleParser } = require('mailparser');
const classifierService = require('./classifierService');
const emailRepository = require('../repositories/emailRepository');
const labelRepository = require('../repositories/labelRepository');
const logger = require('../logger');
const HttpError = require('../utils/httpError');

// sender and subject are VARCHAR(255) columns
const MAX_HEADER_LENGTH = 255;
const truncate = (value) => (value ?? '').slice(0, MAX_HEADER_LENGTH);

/**
 * Tags the e-mail with the user's labels and stores it. If Gemini is unavailable the
 * e-mail is saved anyway, without labels, and `classified` is false.
 */
async function store(userEmail, { sender, subject, body }) {
  const labels = await labelRepository.get(userEmail);

  let assigned = [];
  let classified = true;
  try {
    assigned = await classifierService.classifyEmail(body, labels);
  } catch (error) {
    logger.error({ err: error }, 'E-mail classification failed');
    classified = false;
  }

  const email = await emailRepository.insert(userEmail, {
    sender: truncate(sender),
    subject: truncate(subject),
    body,
    labels: assigned,
  });
  return { ...email, classified };
}

// Extracts sender address, subject and plain-text body from a .eml file
async function parseEml(buffer) {
  let mail;
  try {
    mail = await simpleParser(buffer);
  } catch {
    throw new HttpError(400, 'Invalid .eml file');
  }

  const body = mail.text?.trim();
  if (!body) {
    throw new HttpError(400, 'The e-mail has no text content');
  }
  return {
    sender: mail.from?.value?.[0]?.address || mail.from?.text || '',
    subject: mail.subject || '',
    body,
  };
}

module.exports = { store, parseEml };
