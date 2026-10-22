require('./setup');
const path = require('node:path');
const request = require('supertest');
const app = require('../../src/app');
const classifierService = require('../../src/services/classifierService');
const { bearer } = require('../support/tokens');
const db = require('../support/db');

const ALICE = 'alice@example.com';
const BOB = 'bob@example.com';
const fixture = (name) => path.join(__dirname, '../fixtures', name);

describe('POST /api/emails', () => {
  it('stores the e-mail with the labels chosen by the classifier', async () => {
    const res = await request(app)
      .post('/api/emails')
      .set('Authorization', bearer('alice'))
      .send({ sender: 'marco@example.com', subject: 'Roma', body: 'Treno e Viaggi per Roma' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sender: 'marco@example.com',
      labels: ['Viaggi'],
      classified: true,
    });
    expect(await db.count('emails WHERE user_email = $1', [ALICE])).toBe(1);
  });

  it('stores the e-mail without labels when Gemini is unavailable', async () => {
    classifierService.classifyEmail.mockRejectedValue(new Error('Gemini down'));

    const res = await request(app)
      .post('/api/emails')
      .set('Authorization', bearer('alice'))
      .send({ body: 'Viaggi' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ labels: [], classified: false });
  });

  it('requires a body', async () => {
    await request(app)
      .post('/api/emails')
      .set('Authorization', bearer('alice'))
      .send({ subject: 'x' })
      .expect(400);
  });
});

describe('POST /api/emails/upload', () => {
  const upload = (file, name) =>
    request(app)
      .post('/api/emails/upload')
      .set('Authorization', bearer('alice'))
      .attach('file', file, name);

  it('parses and stores a .eml file', async () => {
    const res = await upload(fixture('viaggio-roma.eml'));

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      sender: 'marco.rinaldi@example.com',
      subject: 'Viaggio a Roma - dettagli e organizzazione',
    });
  });

  it('accepts only .eml files', async () => {
    const res = await upload(Buffer.from('MZ...'), 'program.exe');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('UnsupportedFile');
  });

  it('rejects files larger than 10 MB', async () => {
    const res = await upload(Buffer.alloc(10 * 1024 * 1024 + 1), 'big.eml');
    expect(res.status).toBe(413);
  });
});

describe('GET /api/emails (search)', () => {
  beforeEach(async () => {
    await db.insertEmail(ALICE, {
      sender: 'marco@example.com',
      subject: 'Roma',
      body: 'Treno per Roma, cena a Trastevere',
      labels: ['Viaggi'],
    });
    await db.insertEmail(ALICE, {
      sender: 'hr@azienda.example',
      subject: 'Colloquio',
      body: 'Colloquio di lavoro lunedì',
      labels: ['Lavoro'],
    });
    await db.insertEmail(ALICE, {
      sender: 'shop@example.com',
      subject: 'Sconto 100%',
      body: 'Volo per Barcellona',
      labels: ['Viaggi', 'Acquisti'],
    });
    await db.insertEmail(BOB, {
      subject: 'Roma',
      body: 'E-mail di Bob su Roma',
      labels: ['Viaggi'],
    });
  });

  const search = (query) =>
    request(app).get('/api/emails').query(query).set('Authorization', bearer('alice'));
  const subjects = (res) => res.body.map((email) => email.subject).sort();

  it("lists only the user's e-mails, newest first, without internal columns", async () => {
    const res = await search({});

    expect(res.body.map((e) => e.subject)).toEqual(['Sconto 100%', 'Colloquio', 'Roma']);
    expect(res.body[0]).not.toHaveProperty('user_email');
  });

  it.each([
    ['free text in any field (case-insensitive)', { q: 'TRASTEVERE' }, ['Roma']],
    ['sender', { sender: 'azienda' }, ['Colloquio']],
    ['subject', { subject: 'colloquio' }, ['Colloquio']],
    ['all the words in the body', { words: 'treno, cena' }, ['Roma']],
    ['any of the labels', { labels: ['Lavoro', 'Acquisti'] }, ['Colloquio', 'Sconto 100%']],
    ['all the labels', { labels: ['Viaggi', 'Acquisti'], match: 'all' }, ['Sconto 100%']],
    ['text and labels combined', { q: 'Roma', labels: 'Viaggi' }, ['Roma']],
    ["'%' as a literal character, not a wildcard", { q: '100%' }, ['Sconto 100%']],
    ["'_' as a literal character", { q: 'a_b' }, []],
  ])('filters by %s', async (_, query, expected) => {
    expect(subjects(await search(query))).toEqual(expected);
  });

  it('rejects invalid filters', async () => {
    await search({ labels: 'x'.repeat(51) }).expect(400);
  });
});

describe('DELETE /api/emails', () => {
  it("deletes the user's e-mails", async () => {
    const id = await db.insertEmail(ALICE);

    await request(app)
      .delete('/api/emails')
      .set('Authorization', bearer('alice'))
      .send({ ids: [id] })
      .expect(204);
    expect(await db.count('emails')).toBe(0);
  });

  it("cannot delete another user's e-mails", async () => {
    const id = await db.insertEmail(ALICE);

    await request(app)
      .delete('/api/emails')
      .set('Authorization', bearer('bob'))
      .send({ ids: [id] })
      .expect(404);
    expect(await db.count('emails')).toBe(1);
  });

  it('validates the ids', async () => {
    await request(app)
      .delete('/api/emails')
      .set('Authorization', bearer('alice'))
      .send({ ids: ['1; DROP TABLE emails'] })
      .expect(400);
  });
});
