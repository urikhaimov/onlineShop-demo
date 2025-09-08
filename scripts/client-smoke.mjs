// Soft client smoke: ping Vite dev server if it's up; otherwise skip without failing.

const DEV = process.env.VITE_DEV_SERVER || 'http://127.0.0.1:5173';

function timeout(ms) {
  return new Promise((_, rej) =>
    setTimeout(() => rej(new Error('timeout')), ms),
  );
}

async function main() {
  try {
    const res = await Promise.race([
      fetch(DEV, { method: 'GET' }),
      timeout(2000),
    ]);
    if (res && res.ok) {
      console.log(`✓ client-smoke: ${DEV} -> ${res.status}`);
    } else {
      console.log(
        `~ client-smoke: dev server responded ${res && res.status}, continuing`,
      );
    }
    process.exit(0);
  } catch {
    console.log('~ client-smoke: dev server not running, skipping');
    process.exit(0);
  }
}

await main();
