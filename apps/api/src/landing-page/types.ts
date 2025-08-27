export interface LandingPageCard {
  title: string;
  body: string;
  icon?: string; // optional, if you want to show an icon later
}

export interface LandingPageSection {
  title: string;
  subtitle?: string;
  content?: string;
}

export interface LandingPageData {
  title: string;
  subtitle?: string;
  bannerImageUrl?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;
  homepageLayout?: string; // keep typing loose if you don’t share enums
  sections: LandingPageSection[];
  cards?: LandingPageCard[]; // <-- NEW
  bentoCards?: LandingPageCard[];
}
