require('./setup');
const crypto = require('node:crypto');
const request = require('supertest');
const app = require('../../src/app');
const cognitoService = require('../../src/services/cognitoService');
const HttpError = require('../../src/utils/httpError');
const { idToken, bearer } = require('../support/tokens');

const getEmails = (authorization) => {
  const req = request(app).get('/api/emails');
  return authorization ? req.set('Authorization', authorization) : req;
};

describe('Cognito ID token verification', () => {
  it('accepts a valid token', async () => {
    await getEmails(bearer('alice')).expect(200);
  });

  it.each([
    ['no token', undefined],
    ['a token without the Bearer scheme', idToken('alice')],
    ['a malformed token', 'Bearer abc.def.ghi'],
    ['an expired token', bearer('alice', { expiresIn: -60 })],
    ['a token for another app client', bearer('alice', { audience: 'other-client' })],
    [
      'a token from another user pool',
      bearer('alice', { issuer: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Other' }),
    ],
    ['an access token instead of an ID token', bearer('alice', { tokenUse: 'access' })],
    [
      'a token signed with another key',
      bearer('alice', {
        key: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey,
      }),
    ],
    ['a token without e-mail', bearer('alice', { email: '' })],
  ])('rejects %s with 401', async (_, authorization) => {
    await getEmails(authorization).expect(401);
  });
});

describe('authentication endpoints', () => {
  it('logs in and returns the Cognito tokens', async () => {
    cognitoService.login.mockResolvedValue({
      idToken: 'id',
      accessToken: 'a',
      refreshToken: 'r',
      expiresIn: 3600,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'Password1!' });

    expect(res.status).toBe(200);
    expect(res.body.refreshToken).toBe('r');
    expect(cognitoService.login).toHaveBeenCalledWith({
      username: 'alice',
      password: 'Password1!',
    });
  });

  it('returns the Cognito error code to the client', async () => {
    cognitoService.login.mockRejectedValue(
      new HttpError(401, 'Invalid username or password', 'NotAuthorizedException'),
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      message: 'Invalid username or password',
      code: 'NotAuthorizedException',
    });
  });

  it('validates the request before calling Cognito', async () => {
    await request(app).post('/api/auth/login').send({ username: 'alice' }).expect(400);
    await request(app).post('/api/auth/refresh').send({}).expect(400);
    expect(cognitoService.login).not.toHaveBeenCalled();
  });

  it('refreshes the session and revokes the token on logout', async () => {
    cognitoService.refresh.mockResolvedValue({
      idToken: 'new-id',
      accessToken: 'a',
      expiresIn: 3600,
    });

    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'r' })
      .expect(200, { idToken: 'new-id', accessToken: 'a', expiresIn: 3600 });
    await request(app).post('/api/auth/logout').send({ refreshToken: 'r' }).expect(204);
    expect(cognitoService.logout).toHaveBeenCalledWith('r');
  });

  it('requires a logged-in user to change the password', async () => {
    const body = { accessToken: 'a', oldPassword: 'Old1!pass', newPassword: 'New1!pass' };

    await request(app).post('/api/auth/change-password').send(body).expect(401);
    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', bearer('alice'))
      .send(body)
      .expect(204);
  });

  it('limits the authentication requests of a client (brute-force protection)', async () => {
    for (let i = 0; i < 50; i++) {
      await request(app).post('/api/auth/forgot-password').send({ email: 'a@example.com' });
    }
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'a@example.com' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe('TooManyRequests');
  });
});
