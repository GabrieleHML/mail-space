require('./setup');
const request = require('supertest');
const app = require('../../src/app');
const { bearer } = require('../support/tokens');
const db = require('../support/db');

const ALICE = 'alice@example.com';
const BOB = 'bob@example.com';
const as = (user) => ({ Authorization: bearer(user) });

describe('folders of the user', () => {
  it('creates, lists and deletes folders', async () => {
    const created = await request(app)
      .post('/api/folders')
      .set(as('alice'))
      .send({ name: '  Lavoro ' });
    expect(created.status).toBe(201);
    expect(created.body).toEqual({ id: expect.any(Number), name: 'Lavoro' });

    await request(app).get('/api/folders').set(as('alice')).expect(200, [created.body]);
    await request(app).delete(`/api/folders/${created.body.id}`).set(as('alice')).expect(204);
    await request(app).get('/api/folders').set(as('alice')).expect(200, []);
  });

  it('refuses two folders with the same name', async () => {
    await db.insertFolder(ALICE, 'Lavoro');

    const res = await request(app).post('/api/folders').set(as('alice')).send({ name: 'Lavoro' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('FolderExists');
  });

  it('adds, lists and removes e-mails of a folder', async () => {
    const folder = await db.insertFolder(ALICE, 'Lavoro');
    const email = await db.insertEmail(ALICE, { subject: 'Colloquio' });

    await request(app)
      .post(`/api/folders/${folder}/emails`)
      .set(as('alice'))
      .send({ emailIds: [email] })
      .expect(200, { added: 1 });
    const listed = await request(app).get(`/api/folders/${folder}/emails`).set(as('alice'));
    expect(listed.body.map((e) => e.subject)).toEqual(['Colloquio']);

    await request(app)
      .delete(`/api/folders/${folder}/emails`)
      .set(as('alice'))
      .send({ emailIds: [email] })
      .expect(200, { removed: 1 });
    expect(await db.count('email_folders')).toBe(0);
  });

  it('validates folder ids and names', async () => {
    await request(app).get('/api/folders/abc/emails').set(as('alice')).expect(400);
    await request(app).post('/api/folders').set(as('alice')).send({ name: '' }).expect(400);
  });
});

// Every id could be guessed: the API must check that the resource belongs to the caller
describe("another user's folders", () => {
  let aliceFolder;
  let aliceEmail;

  beforeEach(async () => {
    aliceFolder = await db.insertFolder(ALICE, 'Privata');
    aliceEmail = await db.insertEmail(ALICE, { subject: 'Segreto' });
    await db.pool.query('INSERT INTO email_folders (email_id, folder_id) VALUES ($1, $2)', [
      aliceEmail,
      aliceFolder,
    ]);
  });

  it('cannot be read', async () => {
    await request(app).get(`/api/folders/${aliceFolder}/emails`).set(as('bob')).expect(404);
  });

  it('cannot be deleted', async () => {
    await request(app).delete(`/api/folders/${aliceFolder}`).set(as('bob')).expect(404);
    expect(await db.count('folders')).toBe(1);
  });

  it('cannot be filled or emptied', async () => {
    const bobEmail = await db.insertEmail(BOB);

    await request(app)
      .post(`/api/folders/${aliceFolder}/emails`)
      .set(as('bob'))
      .send({ emailIds: [bobEmail] })
      .expect(404);
    await request(app)
      .delete(`/api/folders/${aliceFolder}/emails`)
      .set(as('bob'))
      .send({ emailIds: [aliceEmail] })
      .expect(404);
    expect(await db.count('email_folders')).toBe(1);
  });

  it("does not let other users' e-mails into your own folder", async () => {
    const bobFolder = await db.insertFolder(BOB, 'Bob');

    await request(app)
      .post(`/api/folders/${bobFolder}/emails`)
      .set(as('bob'))
      .send({ emailIds: [aliceEmail] })
      .expect(200, { added: 0 });
    await request(app).get(`/api/folders/${bobFolder}/emails`).set(as('bob')).expect(200, []);
  });
});
