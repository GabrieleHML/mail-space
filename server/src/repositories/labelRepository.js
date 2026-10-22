// SQL access to `user_labels`: the tags each user wants Gemini to choose from.
const pool = require('../db');

// Returns the user's labels, creating the row with the default set on first access
async function get(userEmail) {
  await pool.query(
    'INSERT INTO user_labels (user_email) VALUES ($1) ON CONFLICT (user_email) DO NOTHING',
    [userEmail],
  );
  const { rows } = await pool.query('SELECT user_labels FROM user_labels WHERE user_email = $1', [
    userEmail,
  ]);
  return rows[0].user_labels;
}

async function set(userEmail, labels) {
  await pool.query(
    `INSERT INTO user_labels (user_email, user_labels) VALUES ($1, $2)
     ON CONFLICT (user_email) DO UPDATE SET user_labels = EXCLUDED.user_labels`,
    [userEmail, labels],
  );
}

module.exports = { get, set };
