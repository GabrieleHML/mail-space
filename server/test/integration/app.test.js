require('./setup');
const request = require('supertest');
const app = require('../../src/app');
const { bearer } = require('../support/tokens');

describe('HTTP basics', () => {
  it('exposes a public health check', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  it('answers unknown routes with a JSON 404', async () => {
    const res = await request(app).get('/api/nope').set('Authorization', bearer('alice'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'Resource not found' });
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/emails')
      .set('Authorization', bearer('alice'))
      .set('Content-Type', 'application/json')
      .send('{"body":');
    expect(res.status).toBe(400);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not enable CORS unless configured', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
