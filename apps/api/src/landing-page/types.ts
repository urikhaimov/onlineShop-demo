export interface LandingPageSection {
  title?: string;
  subtitle?: string;
  content?: string;
}

export interface LandingPageData {
  title?: string;
  subtitle?: string;
  bannerImageUrl?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
  sections?: LandingPageSection[];
}
