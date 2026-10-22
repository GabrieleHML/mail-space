require('./setup');
const request = require('supertest');
const app = require('../../src/app');
const classifierService = require('../../src/services/classifierService');
const { bearer } = require('../support/tokens');
const db = require('../support/db');

const ALICE = 'alice@example.com';
const as = (user) => ({ Authorization: bearer(user) });
const labelsOf = async (id) =>
  (await db.pool.query('SELECT labels FROM emails WHERE id = $1', [id])).rows[0].labels;

it('gives every new user the default labels', async () => {
  const res = await request(app).get('/api/labels').set(as('alice'));

  expect(res.status).toBe(200);
  expect(res.body).toContain('Viaggi');
  expect(res.body).toHaveLength(11);
});

it('removes deleted labels and re-classifies the e-mails with the new ones', async () => {
  const roma = await db.insertEmail(ALICE, { body: 'Weekend a Roma', labels: ['Viaggi'] });
  const lavoro = await db.insertEmail(ALICE, {
    body: 'Riunione di lavoro',
    labels: ['Lavoro', 'Viaggi'],
  });
  await request(app).get('/api/labels').set(as('alice')); // creates the default labels

  const res = await request(app)
    .put('/api/labels')
    .set(as('alice'))
    .send({ labels: ['Lavoro', 'Roma'] });

  expect(res.status).toBe(200);
  expect(res.body).toMatchObject({ labels: ['Lavoro', 'Roma'], added: ['Roma'], failed: 0 });
  expect(res.body.removed).toContain('Viaggi');
  expect(await labelsOf(roma)).toEqual(['Roma']);
  expect(await labelsOf(lavoro)).toEqual(['Lavoro']);
  await request(app).get('/api/labels').set(as('alice')).expect(200, ['Lavoro', 'Roma']);
});

it('reports how many e-mails Gemini could not re-classify', async () => {
  await db.insertEmail(ALICE, { body: 'Roma' });
  classifierService.classifyEmail.mockRejectedValue(new Error('Gemini down'));

  const res = await request(app)
    .put('/api/labels')
    .set(as('alice'))
    .send({ labels: ['Roma'] });

  expect(res.status).toBe(200);
  expect(res.body.failed).toBe(1);
});

it('rejects a request without the list of labels, instead of deleting them all', async () => {
  await request(app).put('/api/labels').set(as('alice')).send({}).expect(400);
});

it('rejects invalid labels', async () => {
  await request(app)
    .put('/api/labels')
    .set(as('alice'))
    .send({ labels: ['x'.repeat(51)] })
    .expect(400);
});
