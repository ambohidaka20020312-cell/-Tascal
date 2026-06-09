// IAP is not used on web (Stripe is used instead).
export interface IAPOffering { identifier: string; packages: IAPPackage[] }
export interface IAPPackage { identifier: string; product: { identifier: string; title: string; description: string; priceString: string; price: number; currencyCode: string }; packageType: string; rcPackage: unknown }
export interface IAPState { available: false; loading: false; offerings: []; customerInfo: null; error: null; isPro: false }

export function useIAP() {
  return {
    available: false as const,
    loading: false as const,
    offerings: [] as IAPOffering[],
    customerInfo: null,
    error: null,
    isPro: false as const,
    purchase: async (_pkg: IAPPackage) => {},
    restore: async () => {},
    refresh: async () => {},
  };
}
