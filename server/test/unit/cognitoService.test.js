const { mockClient } = require('aws-sdk-client-mock');
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  RevokeTokenCommand,
  ForgotPasswordCommand,
  ChangePasswordCommand,
  SignUpCommand,
} = require('@aws-sdk/client-cognito-identity-provider');
const cognitoService = require('../../src/services/cognitoService');

const cognito = mockClient(CognitoIdentityProviderClient);

// Cognito errors are identified by their name, e.g. "NotAuthorizedException"
const cognitoError = (name) => Object.assign(new Error(name), { name });

beforeEach(() => cognito.reset());

describe('login', () => {
  it('returns the tokens issued by Cognito', async () => {
    cognito.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        IdToken: 'id',
        AccessToken: 'access',
        RefreshToken: 'refresh',
        ExpiresIn: 3600,
      },
    });

    await expect(cognitoService.login({ username: 'alice', password: 'pw' })).resolves.toEqual({
      idToken: 'id',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
    });
    expect(cognito.commandCalls(InitiateAuthCommand)[0].args[0].input.AuthFlow).toBe(
      'USER_PASSWORD_AUTH',
    );
  });

  it.each(['NotAuthorizedException', 'UserNotFoundException'])(
    'answers %s with the same 401, so usernames cannot be probed',
    async (name) => {
      cognito.on(InitiateAuthCommand).rejects(cognitoError(name));

      await expect(cognitoService.login({ username: 'x', password: 'y' })).rejects.toMatchObject({
        status: 401,
        code: 'NotAuthorizedException',
      });
    },
  );

  it('rejects challenges the UI does not support', async () => {
    cognito.on(InitiateAuthCommand).resolves({ ChallengeName: 'NEW_PASSWORD_REQUIRED' });

    await expect(cognitoService.login({ username: 'x', password: 'y' })).rejects.toMatchObject({
      status: 403,
      code: 'NEW_PASSWORD_REQUIRED',
    });
  });
});

describe('error mapping', () => {
  it('turns known Cognito errors into HTTP errors with the Cognito code', async () => {
    cognito.on(SignUpCommand).rejects(cognitoError('UsernameExistsException'));

    await expect(
      cognitoService.signUp({ username: 'alice', email: 'a@example.com', password: 'pw' }),
    ).rejects.toMatchObject({ status: 409, code: 'UsernameExistsException' });
  });

  it('lets unexpected errors through as internal errors', async () => {
    cognito.on(SignUpCommand).rejects(new Error('socket hang up'));

    await expect(
      cognitoService.signUp({ username: 'alice', email: 'a@example.com', password: 'pw' }),
    ).rejects.toThrow('socket hang up');
  });

  it('reports a wrong current password as 400, not as an expired session (401)', async () => {
    cognito.on(ChangePasswordCommand).rejects(cognitoError('NotAuthorizedException'));

    await expect(
      cognitoService.changePassword({ accessToken: 'a', oldPassword: 'x', newPassword: 'y' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('forgotPassword', () => {
  it('does not reveal whether the account exists', async () => {
    cognito.on(ForgotPasswordCommand).rejects(cognitoError('UserNotFoundException'));

    await expect(cognitoService.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
  });

  it('still reports rate limiting', async () => {
    cognito.on(ForgotPasswordCommand).rejects(cognitoError('LimitExceededException'));

    await expect(cognitoService.forgotPassword('a@example.com')).rejects.toMatchObject({
      status: 429,
    });
  });
});

describe('logout', () => {
  it('revokes the refresh token and ignores revocation errors', async () => {
    cognito.on(RevokeTokenCommand).rejects(cognitoError('UnsupportedTokenTypeException'));

    await expect(cognitoService.logout('refresh-token')).resolves.toBeUndefined();
    expect(cognito.commandCalls(RevokeTokenCommand)[0].args[0].input.Token).toBe('refresh-token');
  });
});
