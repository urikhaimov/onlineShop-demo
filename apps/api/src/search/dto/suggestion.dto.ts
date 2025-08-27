// apps/server/src/search/dto/suggestion.dto.ts
export type ProductSuggestionDTO = {
  type: 'product';
  id: string;
  title: string;
  slug: string;
};

export type CategorySuggestionDTO = {
  type: 'category';
  id: string;
  name: string;
  slug: string;
};

export type SuggestionDTO = ProductSuggestionDTO | CategorySuggestionDTO;
