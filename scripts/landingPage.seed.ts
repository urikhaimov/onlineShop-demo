/* eslint-disable no-console */
const admin = require('firebase-admin');

// ---- CONFIG ---------------------------------------------------------------
const PROJECT_ID = 'onlinestoretemplate-59d3e';

// ---- INIT ----------------------------------------------------------------
function initAdmin() {
  if (admin.apps.length) return admin.app();
  const opts = {
    credential: admin.credential.applicationDefault(),
    projectId: PROJECT_ID, // forces a specific project if provided
  };
  console.log('🔧 Initializing Firebase Admin…', {
    projectId: opts.projectId || '(from ADC)',
    hasGOOGLE_APPLICATION_CREDENTIALS:
      !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
  return admin.initializeApp(opts);
}

// ---- DATA ----------------------------------------------------------------
const data = {
  title: 'ברוכים הבאים ל־Bunder Shop',
  subtitle: 'חנות האוכל האחת שלך לכל הצרכים',
  bannerImageUrl: '/assets/banner.jpg',
  ctaButtonText: 'קנו עכשיו',
  ctaButtonLink: '/products',
  homepageLayout: 'hero',
  sections: [
    {
      title: 'המומלצים השבועיים',
      content:
        'גלו את הפירות, הירקות, מוצרי החלב והמאפים הטריים שנבחרו במיוחד לשבוע זה.',
    },
    {
      title: 'איכות וחומרי גלם',
      content:
        'אנחנו עובדים עם חוות מקומיות וספקים אמינים כדי להביא לכם מוצרים עונתיים באיכות גבוהה.',
    },
    {
      title: 'איך זה עובד?',
      content:
        'מזמינים עד 18:00 ומקבלים משלוח ביום שלמחרת. ניתן לעקוב אחרי ההזמנה עד לדלת הבית.',
    },
    {
      title: 'שביעות רצון מובטחת',
      content: 'לא מרוצים ממוצר? נקזז, נחליף או נזכה — בלי שאלות מיותרות.',
    },
  ],
  cards: [
    { title: 'משלוח חינם', body: 'בהזמנות מעל ₪350' },
    { title: 'תמיכה 24/7', body: 'אנחנו כאן בשבילכם תמיד' },
    { title: 'טרי ומקומי', body: 'מוצרים שנבחרו בעונה' },
    { title: '★ 4.9', body: '+2,400 ביקורות' },
    { title: 'השקות חדשות', body: 'כל יום שישי 10:00' },
    { title: 'תשלום מאובטח', body: 'Stripe + 3D Secure' },
  ],
};

// ---- MAIN ----------------------------------------------------------------
(async () => {
  try {
    const app = initAdmin();
    const db = admin.firestore();

    // Safety: if emulator is on, say it
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      console.warn(
        '⚠️  FIRESTORE_EMULATOR_HOST is set:',
        process.env.FIRESTORE_EMULATOR_HOST,
      );
    }

    console.log(
      '📦 Firestore ready. Using project:',
      app.options.projectId || '(ADC)',
    );
    const ref = db.collection('landingPages').doc('default');
    console.log('📝 Writing landingPage/default …');
    await ref.set(data, { merge: true });

    const snap = await ref.get();
    console.log('✅ Seeded. Current title:', snap.get('title'));
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
})();
