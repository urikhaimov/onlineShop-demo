import { Injectable } from '@nestjs/common';
import { LandingPageData } from './types';

const DEFAULT_DATA: LandingPageData = {
  title: 'Welcome to Bunder Shop',
  subtitle: 'Your one-stop e-commerce store',
  bannerImageUrl: '/assets/banner.jpg',
  ctaButtonText: 'Shop Now',
  ctaButtonLink: '/products',
  sections: [
    {
      title: 'Featured Deals',
      subtitle: 'Best prices for you',
      content: 'Check out our daily deals on popular products.',
    },
  ],
};

@Injectable()
export class LandingPageService {
  private data: LandingPageData = { ...DEFAULT_DATA }; // in-memory store

  get(): LandingPageData {
    return this.data;
  }

  update(updated: LandingPageData): LandingPageData {
    this.data = { ...this.data, ...updated };
    return this.data;
  }
}
