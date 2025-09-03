import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as public (no auth required).
 * Your guards should check this metadata and skip auth if present.
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
