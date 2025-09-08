// scripts/emu-purge-seed.js
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'onlinestoretemplate-59d3e' });

const db = admin.firestore();

(async () => {
  // 1) Delete products created by the seed
  const seedProds = await db
    .collection('products')
    .where('metadata.createdBy.uid', '==', 'seed')
    .get();

  const batchSize = 400;
  let i = 0;
  while (i < seedProds.size) {
    const batch = db.batch();
    seedProds.docs.slice(i, i + batchSize).forEach((d) => batch.delete(d.ref));
    await batch.commit();
    i += batchSize;
  }
  console.log(`Deleted ${seedProds.size} seeded products`);

  // 2) Delete the 4 sample categories by name (if present)
  const sampleNames = ['Beverages', 'Snacks', 'Bakery', 'Produce'];
  for (const name of sampleNames) {
    const snap = await db
      .collection('categories')
      .where('name', '==', name)
      .get();
    const b = db.batch();
    snap.forEach((d) => b.delete(d.ref));
    if (!snap.empty) {
      await b.commit();
      console.log(`Deleted sample category "${name}" (${snap.size})`);
    }
  }

  // 3) Optional: backfill products that have missing/empty categoryId (mark as "uncategorized")
  const all = await db.collection('products').get();
  const toFix = all.docs.filter(
    (d) =>
      !('categoryId' in d.data()) ||
      d.get('categoryId') == null ||
      d.get('categoryId') === '',
  );
  i = 0;
  while (i < toFix.length) {
    const batch = db.batch();
    toFix
      .slice(i, i + batchSize)
      .forEach((d) => batch.update(d.ref, { categoryId: 'uncategorized' }));
    await batch.commit();
    i += batchSize;
  }
  if (toFix.length) {
    console.log(
      `Backfilled ${toFix.length} products with categoryId = "uncategorized"`,
    );
  }

  console.log('Done.');
  process.exit(0);
})();
