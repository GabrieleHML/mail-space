// Amazon Cognito user pool operations (sign-up, login, tokens, passwords).
// The app client is public (no secret) and must allow USER_PASSWORD_AUTH and
// REFRESH_TOKEN_AUTH; these operations do not need AWS credentials.
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  RevokeTokenCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ChangePasswordCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const config = require('../config');
const logger = require('../logger');
const HttpError = require('../utils/httpError');

const client = new CognitoIdentityProviderClient({ region: config.aws.region });
const ClientId = config.cognito.clientId;

// Cognito errors caused by the request; anything else is an internal error
const CLIENT_ERROR_STATUS = {
  UsernameExistsException: 409,
  InvalidPasswordException: 400,
  InvalidParameterException: 400,
  CodeMismatchException: 400,
  ExpiredCodeException: 400,
  NotAuthorizedException: 401,
  UserNotFoundException: 401,
  UserNotConfirmedException: 403,
  PasswordResetRequiredException: 403,
  LimitExceededException: 429,
  TooManyRequestsException: 429,
  TooManyFailedAttemptsException: 429,
};

// Runs a Cognito command and converts expected errors into HttpErrors that carry
// the Cognito error name as `code`, so the client can show a specific message
async function send(command, message, statusOverrides = {}) {
  try {
    return await client.send(command);
  } catch (error) {
    const status = statusOverrides[error.name] ?? CLIENT_ERROR_STATUS[error.name];
    if (!status) throw error;
    throw new HttpError(status, message, error.name);
  }
}

const toTokens = (result) => ({
  idToken: result.IdToken,
  accessToken: result.AccessToken,
  expiresIn: result.ExpiresIn,
});

async function signUp({ username, email, password }) {
  const result = await send(
    new SignUpCommand({
      ClientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    }),
    'Sign-up failed',
  );
  return { userConfirmed: result.UserConfirmed };
}

async function confirmSignUp({ username, code }) {
  await send(
    new ConfirmSignUpCommand({ ClientId, Username: username, ConfirmationCode: code }),
    'Confirmation failed',
    { NotAuthorizedException: 400, UserNotFoundException: 400 },
  );
}

async function login({ username, password }) {
  let result;
  try {
    result = await send(
      new InitiateAuthCommand({
        ClientId,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: { USERNAME: username, PASSWORD: password },
      }),
      'Invalid username or password',
    );
  } catch (error) {
    // Same answer for unknown users and wrong passwords, so usernames cannot be probed
    if (error.code === 'UserNotFoundException') {
      throw new HttpError(401, 'Invalid username or password', 'NotAuthorizedException');
    }
    throw error;
  }

  if (!result.AuthenticationResult) {
    // e.g. NEW_PASSWORD_REQUIRED for users created by an administrator: not supported by the UI
    throw new HttpError(403, 'Additional authentication step required', result.ChallengeName);
  }
  return {
    ...toTokens(result.AuthenticationResult),
    refreshToken: result.AuthenticationResult.RefreshToken,
  };
}

async function refresh(refreshToken) {
  const result = await send(
    new InitiateAuthCommand({
      ClientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
    'Session expired',
  );
  return toTokens(result.AuthenticationResult);
}

// Revokes the refresh token and the access tokens issued with it
async function logout(refreshToken) {
  try {
    await client.send(new RevokeTokenCommand({ ClientId, Token: refreshToken }));
  } catch (error) {
    // The client drops its tokens anyway; an already invalid token is not an error
    logger.warn({ err: error }, 'Token revocation failed');
  }
}

async function forgotPassword(email) {
  try {
    await send(new ForgotPasswordCommand({ ClientId, Username: email }), 'Too many requests');
  } catch (error) {
    // Do not reveal whether the account exists: only rate limiting is reported
    if (error.status === 429) throw error;
    logger.warn({ err: error }, 'Forgot password request failed');
  }
}

async function resetPassword({ email, code, newPassword }) {
  await send(
    new ConfirmForgotPasswordCommand({
      ClientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    }),
    'Password reset failed',
    { UserNotFoundException: 400, NotAuthorizedException: 400 },
  );
}

async function changePassword({ accessToken, oldPassword, newPassword }) {
  await send(
    new ChangePasswordCommand({
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    }),
    'Password change failed',
    // 400 rather than 401: a wrong current password must not look like an expired session
    { NotAuthorizedException: 400 },
  );
}

module.exports = {
  signUp,
  confirmSignUp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
};
