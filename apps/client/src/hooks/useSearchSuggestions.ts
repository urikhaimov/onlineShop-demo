// apps/client/src/hooks/useSearchSuggestions.ts
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';

export type ProductSuggestion = {
  type: 'product';
  id: string;
  title: string;
  slug: string;
};
export type CategorySuggestion = {
  type: 'category';
  id: string;
  name: string;
  slug: string;
};
export type Suggestion = ProductSuggestion | CategorySuggestion;

export function useSearchSuggestions(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ['search-suggest', query],
    queryFn: async () => {
      const { data } = await axiosInstance.get<Suggestion[]>(
        '/search/suggest',
        {
          params: { q: query },
        },
      );
      return data ?? [];
    },
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}
