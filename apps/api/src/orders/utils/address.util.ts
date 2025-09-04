export type InputAddress =
  | {
      fullName?: string;
      phone?: string;
      street?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    }
  | null
  | undefined;

export function toPlainAddress(a?: InputAddress) {
  if (!a) return null;
  return {
    fullName: String(a.fullName ?? ''),
    phone: String(a.phone ?? ''),
    street: String(a.street ?? ''),
    city: String(a.city ?? ''),
    postalCode: String(a.postalCode ?? ''),
    country: String(a.country ?? ''),
  };
}
