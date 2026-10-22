// SQL access to the `emails` table. Every query is scoped to the owner's e-mail
// address, so a user can never read or change another user's data.
const pool = require('../db');

const COLUMNS = 'id, sender, subject, body, labels';

// Case-insensitive "contains" pattern; % and _ typed by the user are matched literally
const contains = (value) => `%${value.replace(/[\\%_]/g, '\\$&')}%`;

async function insert(userEmail, { sender, subject, body, labels }) {
  const { rows } = await pool.query(
    `INSERT INTO emails (user_email, sender, subject, body, labels)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLUMNS}`,
    [userEmail, sender, subject, body, labels],
  );
  return rows[0];
}

/**
 * Lists the user's e-mails, newest first, applying only the filters that are set:
 * - text: contained in sender, subject or body
 * - sender / subject: contained in that field
 * - words: every word contained in the body
 * - labels: e-mails with all (matchAll) or at least one of the labels
 */
async function search(
  userEmail,
  { text, sender, subject, words = [], labels = [], matchAll = false } = {},
) {
  const params = [userEmail];
  const conditions = ['user_email = $1'];
  const param = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (text) {
    const p = param(contains(text));
    conditions.push(`(sender ILIKE ${p} OR subject ILIKE ${p} OR body ILIKE ${p})`);
  }
  if (sender) conditions.push(`sender ILIKE ${param(contains(sender))}`);
  if (subject) conditions.push(`subject ILIKE ${param(contains(subject))}`);
  for (const word of words) conditions.push(`body ILIKE ${param(contains(word))}`);
  if (labels.length > 0) {
    conditions.push(`labels ${matchAll ? '@>' : '&&'} ${param(labels)}::text[]`);
  }

  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM emails WHERE ${conditions.join(' AND ')} ORDER BY id DESC`,
    params,
  );
  return rows;
}

async function deleteMany(userEmail, ids) {
  const { rowCount } = await pool.query(
    'DELETE FROM emails WHERE id = ANY($1::int[]) AND user_email = $2',
    [ids, userEmail],
  );
  return rowCount;
}

async function addLabels(userEmail, id, labels) {
  await pool.query(
    `UPDATE emails
     SET labels = ARRAY(SELECT DISTINCT unnest(labels || $3::text[]))
     WHERE id = $1 AND user_email = $2`,
    [id, userEmail, labels],
  );
}

// Removes the given labels from all the user's e-mails
async function removeLabelsFromAll(userEmail, labels) {
  await pool.query(
    `UPDATE emails
     SET labels = ARRAY(SELECT label FROM unnest(labels) AS label WHERE label <> ALL($2::text[]))
     WHERE user_email = $1 AND labels && $2::text[]`,
    [userEmail, labels],
  );
}

module.exports = { insert, search, deleteMany, addLabels, removeLabelsFromAll };
