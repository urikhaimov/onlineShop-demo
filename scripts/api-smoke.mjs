// scripts/api-smoke.mjs
// Smoke the API: /health, /categories[/*], /products[/*].
// Always authenticate first so protected "public" endpoints still pass.

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:3000/api';
const AUTH_HOST = process.env.AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const AUTH_BASE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1`;
const API_KEY = 'fake-api-key';

const EMAIL = process.env.SMOKE_EMAIL || 'urikhaimov@gmail.com';
const PASSWORD = process.env.SMOKE_PASSWORD || 'admin777';

async function jpost(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const txt = await r.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = txt;
  }
  if (!r.ok)
    throw new Error(`${r.status} ${r.statusText} – ${JSON.stringify(data)}`);
  return data;
}

async function jget(url, headers) {
  const r = await fetch(url, { headers });
  const txt = await r.text();
  let data;
  try {
    data = JSON.parse(txt);
  } catch {
    data = txt;
  }
  if (!r.ok)
    throw new Error(`${r.status} ${r.statusText} – ${JSON.stringify(data)}`);
  return data;
}

async function signIn() {
  const res = await jpost(
    `${AUTH_BASE}/accounts:signInWithPassword?key=${API_KEY}`,
    { email: EMAIL, password: PASSWORD, returnSecureToken: true },
  );
  if (!res.idToken) throw new Error('No idToken from auth emulator');
  return res.idToken;
}

async function getWithFallback(base, pathA, pathB, headers) {
  try {
    return await jget(`${base}${pathA}`, headers);
  } catch (e) {
    if (String(e).includes('404')) {
      return await jget(`${base}${pathB}`, headers);
    }
    throw e;
  }
}

(async () => {
  try {
    // health
    const health = await jget(`${API_BASE}/health`);
    console.log('✓ api-smoke: /health ->', health);

    // auth first (use the token for every subsequent call)
    const token = await signIn();
    const authHeaders = { Authorization: `Bearer ${token}` };

    // categories (public -> private, with auth header)
    const cats = await getWithFallback(
      API_BASE,
      '/categories/public?limit=1',
      '/categories?limit=1',
      authHeaders,
    );
    const catCount = Array.isArray(cats.items)
      ? cats.items.length
      : cats.length || 0;
    console.log(`✓ api-smoke: categories -> ${catCount} item(s)`);

    // products (public -> private, with auth header)
    const prods = await getWithFallback(
      API_BASE,
      '/products/public?limit=1',
      '/products?limit=1',
      authHeaders,
    );
    const prodCount = Array.isArray(prods.items)
      ? prods.items.length
      : prods.length || 0;
    console.log(`✓ api-smoke: products -> ${prodCount} item(s)`);

    process.exit(0);
  } catch (err) {
    console.error('✗ api-smoke:', err.message || err);
    process.exit(1);
  }
})();
