// apps/server/src/search/search.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SuggestionDTO } from './dto/suggestion.dto';
import * as admin from 'firebase-admin';

const FALLBACK: SuggestionDTO[] = [
  {
    type: 'product',
    id: 'p1',
    title: 'Premium Leather Seat Covers',
    slug: 'premium-leather-seat-covers',
  },
  {
    type: 'product',
    id: 'p2',
    title: 'Heated Seat Cushion',
    slug: 'heated-seat-cushion',
  },
  {
    type: 'product',
    id: 'p3',
    title: 'Seat Organizer',
    slug: 'seat-organizer',
  },
  {
    type: 'category',
    id: 'c1',
    name: 'Interior Upgrades',
    slug: 'interior-upgrades',
  },
  {
    type: 'category',
    id: 'c2',
    name: 'Car Accessories',
    slug: 'car-accessories',
  },
];

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly fakeMode: boolean;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {
    this.fakeMode = this.config.get('SEARCH_FAKE') === '1';
  }

  private get db() {
    try {
      // returns null if admin not initialized
      return admin.apps.length ? admin.firestore() : null;
    } catch {
      return null;
    }
  }

  async suggest(q: string): Promise<SuggestionDTO[]> {
    const needle = q.trim();
    if (needle.length < 2) return [];

    // 1) Explicit fake mode
    if (this.fakeMode) {
      this.logger.debug(
        `FAKE mode enabled. Returning fallback for "${needle}".`,
      );
      return this.filterFallback(needle);
    }

    // 2) Try Firestore
    const db = this.db;
    if (!db) {
      this.logger.warn('Firestore is not initialized. Returning fallback.');
      return this.filterFallback(needle);
    }

    try {
      const prefix = needle.toUpperCase();
      const [products, categories] = await Promise.all([
        db
          .collection('products')
          .where('titleUpper', '>=', prefix)
          .where('titleUpper', '<', prefix + '\uf8ff')
          .limit(5)
          .get(),
        db
          .collection('categories')
          .where('nameUpper', '>=', prefix)
          .where('nameUpper', '<', prefix + '\uf8ff')
          .limit(3)
          .get(),
      ]);

      const out: SuggestionDTO[] = [
        ...products.docs.map((d) => {
          interface ProductDoc {
            title?: string;
            slug?: string;
          }
          const v = d.data() as ProductDoc;
          return {
            type: 'product' as const,
            id: d.id,
            title: v.title ?? '',
            slug: v.slug ?? d.id,
          };
        }),
        ...categories.docs.map((d) => {
          interface CategoryDoc {
            name?: string;
            slug?: string;
          }
          const v = d.data() as CategoryDoc;
          return {
            type: 'category' as const,
            id: d.id,
            name: v.name ?? '',
            slug: v.slug ?? d.id,
          };
        }),
      ];

      // 3) If DB returns nothing, fall back (nice for dev)
      if (out.length === 0) {
        this.logger.debug(`No DB results for "${needle}". Returning fallback.`);
        return this.filterFallback(needle);
      }

      return out;
    } catch (err) {
      this.logger.error(`Search error: ${(err as Error).message}`);
      return this.filterFallback(needle);
    }
  }

  private filterFallback(q: string): SuggestionDTO[] {
    const n = q.toLowerCase();
    return FALLBACK.filter((s) =>
      ('title' in s ? s.title : s.name).toLowerCase().includes(n),
    ).slice(0, 8);
  }
}
