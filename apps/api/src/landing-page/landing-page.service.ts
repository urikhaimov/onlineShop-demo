// apps/api/src/landing-page/landing-page.service.ts
import { Injectable } from '@nestjs/common';
import { Firestore } from '@google-cloud/firestore';
import type { LandingPageData, TBentoCard } from '@common/types';

const DEFAULT_CARDS: TBentoCard[] = [
  { title: 'Free shipping', body: 'On orders over $99' },
  { title: '24/7 support', body: 'We’re here anytime' },
  { title: 'Eco materials', body: 'Consciously sourced' },
  { title: '4.9 ★', body: '2,400+ reviews' },
  { title: 'New drops', body: 'Every Friday 10:00' },
  { title: 'Secure checkout', body: 'Stripe + 3D Secure' },
];

const DEFAULT_DATA: LandingPageData = {
  title: 'Welcome to Bunder Shop',
  subtitle: 'Your one-stop e-commerce store',
  bannerImageUrl: '/assets/banner.jpg',
  ctaButtonText: 'Shop Now',
  ctaButtonLink: '/products',
  homepageLayout: 'hero',
  sections: [
    {
      title: 'Featured Deals',
      content: 'Check out our daily deals on popular products.',
    },
  ],
  bentoCards: DEFAULT_CARDS,
  cards: DEFAULT_CARDS,
};

@Injectable()
export class LandingPageService {
  constructor(private readonly db: Firestore) {}

  private docRef() {
    // ✅ Use the plural path that exists in your DB
    return this.db.collection('landingPages').doc('default');
  }

  private normalize(
    data: Partial<LandingPageData> | undefined,
  ): LandingPageData {
    const d = data ?? {};
    const cards = Array.isArray(d.bentoCards)
      ? d.bentoCards
      : Array.isArray(d.cards)
        ? d.cards
        : DEFAULT_DATA.bentoCards;

    return {
      ...DEFAULT_DATA,
      ...d,
      sections: (d.sections ?? []).map((s) => ({
        title: s.title ?? '',
        content: s.content ?? '',
      })),
      bentoCards: cards,
      cards,
    };
  }

  async get(): Promise<LandingPageData> {
    const snap = await this.docRef().get();
    return this.normalize(
      snap.exists ? (snap.data() as Partial<LandingPageData>) : undefined,
    );
  }

  async update(updated: LandingPageData): Promise<LandingPageData> {
    // Normalize once, save, then read back to be the single source of truth
    const next = this.normalize(updated);
    await this.docRef().set(next, { merge: true });
    return this.get();
  }
}
