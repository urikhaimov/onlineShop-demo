process.env.GOOGLE_CLOUD_PROJECT ||= 'onlinestoretemplate-59d3e';
process.env.GCLOUD_PROJECT ||= process.env.GOOGLE_CLOUD_PROJECT;
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT });
const db = getFirestore();

// simple slugify
const slug = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

(async () => {
  const snap = await db.collection('categories').get();
  let idx = 1;
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    const update = {
      name: d.name ?? d.title ?? doc.id,
      title: d.title ?? d.name ?? doc.id,
      slug: d.slug ?? slug(d.name ?? d.title ?? doc.id),
      published: d.published ?? true,
      isActive: d.isActive ?? true,
      order: Number.isFinite(d.order) ? d.order : idx++,
      'metadata.updatedAt': FieldValue.serverTimestamp(),
    };
    await doc.ref.set(update, { merge: true });
    console.log('patched:', doc.id, '→', update.name);
  }
  console.log(`✅ updated ${snap.size} categories`);
})();
