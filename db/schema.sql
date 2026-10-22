-- Mail Space database schema (PostgreSQL)
--
-- Users are managed by Amazon Cognito: every table references the user
-- by e-mail address instead of a local users table.

CREATE TABLE IF NOT EXISTS emails (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) NOT NULL,
    sender      VARCHAR(255),
    subject     VARCHAR(255),
    body        TEXT,
    labels      TEXT[] NOT NULL DEFAULT '{}'
);

-- Every query is scoped to the current user
CREATE INDEX IF NOT EXISTS idx_emails_user_email ON emails (user_email);
-- Speeds up tag filters (labels @> ... / labels && ...)
CREATE INDEX IF NOT EXISTS idx_emails_labels ON emails USING GIN (labels);

CREATE TABLE IF NOT EXISTS folders (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    UNIQUE (user_email, name)
);

-- Many-to-many: an e-mail can live in several folders
CREATE TABLE IF NOT EXISTS email_folders (
    folder_id   INTEGER NOT NULL REFERENCES folders (id) ON DELETE CASCADE,
    email_id    INTEGER NOT NULL REFERENCES emails (id) ON DELETE CASCADE,
    PRIMARY KEY (email_id, folder_id)
);

-- Speeds up listing the e-mails of a folder (the primary key starts with email_id)
CREATE INDEX IF NOT EXISTS idx_email_folders_folder_id ON email_folders (folder_id);

-- Tags each user wants Gemini to choose from. A row is created on first
-- access with the default set below.
CREATE TABLE IF NOT EXISTS user_labels (
    user_email  VARCHAR(255) PRIMARY KEY,
    user_labels TEXT[] NOT NULL DEFAULT ARRAY[
        'Lavoro', 'Promozioni', 'Newsletter', 'Social', 'Acquisti', 'Viaggi',
        'Spam', 'Bollette', 'Università', 'Spesa', 'Appuntamenti'
    ]
);
