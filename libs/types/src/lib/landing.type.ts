import { HomepageLayout } from './theme-settings.enum';

export type TSectionType = 'text' | 'image' | 'productGrid' | 'testimonial';

export interface TSection {
  id: string; // generated UUID
  title: string;
  type: TSectionType;
  subtitle?: string;
  description?: string;
  content?: string; // for text/testimonial
  imageUrl?: string; // for image
  productIds?: string[]; // for productGrid
}

export type TBentoCard = { title: string; body: string };
export interface LandingPageData {
  title: string;
  subtitle?: string;
  bannerImageUrl?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
  homepageLayout: HomepageLayout; // ✅ required for select
  sections: {
    title: string;
    content: string;
  }[];
  bentoCards?: TBentoCard[];
  cards?: TBentoCard[];
}
