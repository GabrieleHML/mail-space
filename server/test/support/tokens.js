// Cognito-like ID tokens signed with a local RSA key. trustTestKeys() loads the public
// key into the API's verifier, so the real verification code runs in the tests.
const crypto = require('node:crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function trustTestKeys() {
  require('../../src/middlewares/auth').verifier.cacheJwks({ keys: [jwk] });
}

function idToken(username, options = {}) {
  const {
    email = `${username}@example.com`,
    expiresIn = 3600,
    issuer = `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
    audience = process.env.COGNITO_CLIENT_ID,
    tokenUse = 'id',
    key = privateKey,
  } = options;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'RS256', kid: 'test-key', typ: 'JWT' });
  const payload = base64url({
    sub: crypto.randomUUID(),
    email,
    'cognito:username': username,
    iss: issuer,
    aud: audience,
    token_use: tokenUse,
    auth_time: now,
    iat: now,
    exp: now + expiresIn,
  });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), key);
  return `${header}.${payload}.${signature.toString('base64url')}`;
}

const bearer = (username, options) => `Bearer ${idToken(username, options)}`;

module.exports = { trustTestKeys, idToken, bearer };
