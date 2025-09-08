// Simple auth emulator smoke: sign in (or sign up then sign in)

const AUTH_HOST = process.env.AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const AUTH_BASE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
const API_KEY = 'fake-api-key';

// Set your seeded user here (or via env)
const EMAIL = process.env.SMOKE_EMAIL || 'urikhaimov@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin777';

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!r.ok)
    throw new Error(`${r.status} ${r.statusText} – ${JSON.stringify(data)}`);
  return data;
}

async function signIn() {
  return post(`${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`, {
    email: EMAIL,
    password: PASSWORD,
    returnSecureToken: true,
  });
}

async function main() {
  try {
    let res;
    try {
      res = await signIn();
    } catch {
      // create then sign in
      await post(`${AUTH_BASE}/accounts:signUp?key=${API_KEY}`, {
        email: EMAIL,
        password: PASSWORD,
        returnSecureToken: true,
      });
      res = await signIn();
    }
    const token = res.idToken;
    if (!token) throw new Error('No idToken from auth emulator');
    console.log(
      `✓ auth-smoke: signed in as ${EMAIL} (token len: ${token.length})`,
    );
    process.exit(0);
  } catch (err) {
    console.error('✗ auth-smoke:', err.message || err);
    process.exit(1);
  }
}

await main();
