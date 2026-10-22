const cognitoService = require('../services/cognitoService');
const validate = require('../utils/validation');

const username = (body) =>
  validate.text(body.username, 'username', { required: true, maxLength: 128 });
const email = (body) => validate.text(body.email, 'email', { required: true, maxLength: 255 });
const password = (value, name) => validate.text(value, name, { required: true, maxLength: 256 });
const code = (body) => validate.text(body.code, 'code', { required: true, maxLength: 16 });
const token = (value, name) => validate.text(value, name, { required: true, maxLength: 8192 });

async function signUp(req, res) {
  const result = await cognitoService.signUp({
    username: username(req.body),
    email: email(req.body),
    password: password(req.body.password, 'password'),
  });
  res.status(201).json(result);
}

async function confirmSignUp(req, res) {
  await cognitoService.confirmSignUp({ username: username(req.body), code: code(req.body) });
  res.sendStatus(204);
}

async function login(req, res) {
  const tokens = await cognitoService.login({
    username: username(req.body),
    password: password(req.body.password, 'password'),
  });
  res.json(tokens);
}

async function refresh(req, res) {
  res.json(await cognitoService.refresh(token(req.body.refreshToken, 'refreshToken')));
}

async function logout(req, res) {
  await cognitoService.logout(token(req.body.refreshToken, 'refreshToken'));
  res.sendStatus(204);
}

async function forgotPassword(req, res) {
  await cognitoService.forgotPassword(email(req.body));
  res.sendStatus(204);
}

async function resetPassword(req, res) {
  await cognitoService.resetPassword({
    email: email(req.body),
    code: code(req.body),
    newPassword: password(req.body.newPassword, 'newPassword'),
  });
  res.sendStatus(204);
}

async function changePassword(req, res) {
  await cognitoService.changePassword({
    accessToken: token(req.body.accessToken, 'accessToken'),
    oldPassword: password(req.body.oldPassword, 'oldPassword'),
    newPassword: password(req.body.newPassword, 'newPassword'),
  });
  res.sendStatus(204);
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
