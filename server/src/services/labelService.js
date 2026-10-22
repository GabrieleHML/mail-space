// Business logic for the user's labels: saving a new set of labels removes the
// deleted ones from all e-mails and asks Gemini which e-mails match the new ones.
const classifierService = require('./classifierService');
const emailRepository = require('../repositories/emailRepository');
const labelRepository = require('../repositories/labelRepository');
const logger = require('../logger');

// Maximum number of parallel Gemini requests while re-classifying the e-mails
const GEMINI_CONCURRENCY = 5;

// Runs fn on every item with at most `limit` calls in flight at the same time
async function forEachWithConcurrency(items, limit, fn) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      await fn(items[next++]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * Replaces the user's labels with `labels` and updates the existing e-mails.
 * Returns the added and removed labels and how many e-mails could not be re-classified.
 */
async function update(userEmail, labels) {
  const current = await labelRepository.get(userEmail);
  const removed = current.filter((label) => !labels.includes(label));
  const added = labels.filter((label) => !current.includes(label));

  await labelRepository.set(userEmail, labels);
  if (removed.length > 0) {
    await emailRepository.removeLabelsFromAll(userEmail, removed);
  }

  let failed = 0;
  if (added.length > 0) {
    const emails = await emailRepository.search(userEmail);
    await forEachWithConcurrency(emails, GEMINI_CONCURRENCY, async (email) => {
      try {
        const predicted = await classifierService.classifyEmail(email.body, labels);
        const newLabels = predicted.filter((label) => added.includes(label));
        if (newLabels.length > 0) {
          await emailRepository.addLabels(userEmail, email.id, newLabels);
        }
      } catch (error) {
        failed++;
        logger.warn({ err: error, emailId: email.id }, 'Re-classification failed');
      }
    });
  }

  return { labels, added, removed, failed };
}

module.exports = { update };
