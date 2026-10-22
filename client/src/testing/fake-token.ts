// Unsigned JWT with the claims the client reads from a Cognito ID token (tests only)
const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export function fakeIdToken(username: string, email = `${username}@example.com`): string {
  return `${base64url({ alg: 'none' })}.${base64url({ 'cognito:username': username, email })}.signature`;
}
