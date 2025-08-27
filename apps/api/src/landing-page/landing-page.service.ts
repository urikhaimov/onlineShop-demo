// apps/api/src/landing-page/landing-page.service.ts
import { Injectable } from '@nestjs/common';
import { LandingPageData, LandingPageCard } from './types';

const DEFAULT_CARDS: LandingPageCard[] = [
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
  bentoCards: DEFAULT_CARDS, // ensure we always have cards by default
  cards: DEFAULT_CARDS, // keep legacy `cards` too, for old clients
};

@Injectable()
export class LandingPageService {
  private data: LandingPageData = { ...DEFAULT_DATA };

  get(): LandingPageData {
    return this.data;
  }

  update(updated: LandingPageData): LandingPageData {
    // Prefer updated.bentoCards; accept updated.cards as legacy fallback; else keep existing
    const nextCards: LandingPageCard[] | undefined = Array.isArray(
      updated.bentoCards,
    )
      ? updated.bentoCards
      : Array.isArray(updated.cards)
        ? updated.cards
        : (this.data.bentoCards ?? this.data.cards);

    this.data = {
      ...this.data,
      ...updated,
      bentoCards: nextCards,
      // normalize so both keys exist in responses
      cards: nextCards,
    };

    return this.data;
  }
}
