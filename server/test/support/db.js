const pool = require('../../src/db');

async function resetDatabase() {
  await pool.query('TRUNCATE emails, folders, email_folders, user_labels RESTART IDENTITY CASCADE');
}

async function insertEmail(userEmail, fields = {}) {
  const { sender = 'sender@example.com', subject = 'Subject', body = 'Body', labels = [] } = fields;
  const { rows } = await pool.query(
    `INSERT INTO emails (user_email, sender, subject, body, labels)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [userEmail, sender, subject, body, labels],
  );
  return rows[0].id;
}

async function insertFolder(userEmail, name) {
  const { rows } = await pool.query(
    'INSERT INTO folders (user_email, name) VALUES ($1, $2) RETURNING id',
    [userEmail, name],
  );
  return rows[0].id;
}

async function count(sql, params) {
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM ${sql}`, params);
  return rows[0].n;
}

const closeDatabase = () => pool.end();

module.exports = { pool, resetDatabase, insertEmail, insertFolder, count, closeDatabase };
