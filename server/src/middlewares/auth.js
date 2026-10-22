// Authenticates requests with the Cognito ID token sent as "Authorization: Bearer <token>".
// The token signature is verified against the user pool public keys (JWKS), together with
// issuer, audience (app client), token use and expiration.
const { CognitoJwtVerifier } = require('aws-jwt-verify');
const config = require('../config');
const HttpError = require('../utils/httpError');

const verifier = CognitoJwtVerifier.create({
  userPoolId: config.cognito.userPoolId,
  clientId: config.cognito.clientId,
  tokenUse: 'id',
});

async function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Missing bearer token');
  }

  let payload;
  try {
    payload = await verifier.verify(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token', 'InvalidToken');
  }
  if (!payload.email) {
    throw new HttpError(401, 'Token without e-mail claim', 'InvalidToken');
  }

  req.user = { email: payload.email, username: payload['cognito:username'] };
  next();
}

module.exports = { requireAuth, verifier };
