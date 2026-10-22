// SQL access to `folders` and `email_folders`, always scoped to the owner.
const pool = require('../db');

async function list(userEmail) {
  const { rows } = await pool.query(
    'SELECT id, name FROM folders WHERE user_email = $1 ORDER BY name',
    [userEmail],
  );
  return rows;
}

// Returns the new folder, or null if the user already has one with this name
async function create(userEmail, name) {
  const { rows } = await pool.query(
    `INSERT INTO folders (user_email, name) VALUES ($1, $2)
     ON CONFLICT (user_email, name) DO NOTHING
     RETURNING id, name`,
    [userEmail, name],
  );
  return rows[0] ?? null;
}

async function remove(userEmail, id) {
  const { rowCount } = await pool.query('DELETE FROM folders WHERE id = $1 AND user_email = $2', [
    id,
    userEmail,
  ]);
  return rowCount > 0;
}

async function exists(userEmail, id) {
  const { rowCount } = await pool.query('SELECT 1 FROM folders WHERE id = $1 AND user_email = $2', [
    id,
    userEmail,
  ]);
  return rowCount > 0;
}

async function listEmails(userEmail, folderId) {
  const { rows } = await pool.query(
    `SELECT e.id, e.sender, e.subject, e.body, e.labels
     FROM emails e
     JOIN email_folders ef ON ef.email_id = e.id
     JOIN folders f ON f.id = ef.folder_id
     WHERE f.id = $1 AND f.user_email = $2
     ORDER BY e.id DESC`,
    [folderId, userEmail],
  );
  return rows;
}

// Links only e-mails owned by the user; returns how many were added
async function addEmails(userEmail, folderId, emailIds) {
  const { rowCount } = await pool.query(
    `INSERT INTO email_folders (email_id, folder_id)
     SELECT e.id, f.id
     FROM emails e
     JOIN folders f ON f.id = $2 AND f.user_email = $3
     WHERE e.id = ANY($1::int[]) AND e.user_email = $3
     ON CONFLICT DO NOTHING`,
    [emailIds, folderId, userEmail],
  );
  return rowCount;
}

async function removeEmails(userEmail, folderId, emailIds) {
  const { rowCount } = await pool.query(
    `DELETE FROM email_folders ef
     USING folders f
     WHERE ef.folder_id = f.id
       AND f.id = $2
       AND f.user_email = $3
       AND ef.email_id = ANY($1::int[])`,
    [emailIds, folderId, userEmail],
  );
  return rowCount;
}

module.exports = { list, create, remove, exists, listEmails, addEmails, removeEmails };
