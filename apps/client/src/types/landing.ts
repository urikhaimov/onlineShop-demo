import { HomepageLayout } from '@common/types';

export type SectionType = 'text' | 'image' | 'productGrid' | 'testimonial';

export interface Section {
  id: string; // generated UUID
  title: string;
  type: SectionType;
  subtitle?: string;
  description?: string;
  content?: string; // for text/testimonial
  imageUrl?: string; // for image
  productIds?: string[]; // for productGrid
}
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
}
