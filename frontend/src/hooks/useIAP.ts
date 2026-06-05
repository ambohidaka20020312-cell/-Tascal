/**
 * Apple / Google IAP hook via RevenueCat (native platforms only).
 *
 * On web: always returns { available: false } — Stripe is used instead.
 * On iOS/Android: initializes RevenueCat and exposes purchase/restore flows.
 *
 * RevenueCat free tier covers up to $2,500 MRR.
 * Configure VITE_REVENUECAT_IOS_KEY and VITE_REVENUECAT_ANDROID_KEY
 * in .env / Render environment.
 */
import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuthStore } from "../store/authStore";
import api from "../utils/api";

// Lazy import RevenueCat to avoid web bundle bloat
type PurchasesType = typeof import("@revenuecat/purchases-capacitor").Purchases;
type CustomerInfo = import("@revenuecat/purchases-capacitor").CustomerInfo;
type PurchasesPackage = import("@revenuecat/purchases-capacitor").PurchasesPackage;

export interface IAPOffering {
  identifier: string;
  packages: IAPPackage[];
}

export interface IAPPackage {
  identifier: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    priceString: string;
    price: number;
    currencyCode: string;
  };
  packageType: string;
  rcPackage: PurchasesPackage;
}

export interface IAPState {
  available: boolean;
  loading: boolean;
  offerings: IAPOffering[];
  customerInfo: CustomerInfo | null;
  error: string | null;
  isPro: boolean;
}

const RC_ENTITLEMENT = "pro";

let _Purchases: PurchasesType | null = null;

async function getPurchases(): Promise<PurchasesType> {
  if (!_Purchases) {
    const mod = await import("@revenuecat/purchases-capacitor");
    _Purchases = mod.Purchases;
  }
  return _Purchases!;
}

function mapEntitlementToPlan(customerInfo: CustomerInfo): string {
  const active = customerInfo.entitlements?.active ?? {};
  if (active["team"] || active["business"]) return "team";
  if (active[RC_ENTITLEMENT] || active["personal_pro"]) return "personal_pro";
  return "free";
}

export function useIAP(): IAPState & {
  purchase: (pkg: IAPPackage) => Promise<void>;
  restore: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [state, setState] = useState<IAPState>({
    available: false,
    loading: isNative,
    offerings: [],
    customerInfo: null,
    error: null,
    isPro: false,
  });

  const syncPlanToBackend = useCallback(
    async (customerInfo: CustomerInfo) => {
      const plan = mapEntitlementToPlan(customerInfo);
      try {
        await api.post("/billing/iap-sync", {
          plan,
          original_app_user_id: customerInfo.originalAppUserId,
          entitlements: Object.keys(customerInfo.entitlements?.active ?? {}),
        });
        if (user) setUser({ ...user, plan: plan as typeof user.plan });
      } catch {
        // Non-fatal: local state still updates
      }
    },
    [user, setUser]
  );

  const loadOfferings = useCallback(async (RC: PurchasesType) => {
    try {
      const result = await RC.getOfferings();
      const current = result.current;
      if (!current) return [];

      const packages: IAPPackage[] = (current.availablePackages ?? []).map(
        (pkg: PurchasesPackage) => ({
          identifier: pkg.identifier,
          packageType: pkg.packageType,
          product: {
            identifier: pkg.product.identifier,
            title: pkg.product.title,
            description: pkg.product.description,
            priceString: pkg.product.priceString,
            price: pkg.product.price,
            currencyCode: pkg.product.currencyCode,
          },
          rcPackage: pkg,
        })
      );

      return [{ identifier: current.identifier, packages }];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;

    const apiKey =
      platform === "ios"
        ? import.meta.env.VITE_REVENUECAT_IOS_KEY
        : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

    if (!apiKey) {
      setState((s) => ({ ...s, loading: false, available: false }));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const RC = await getPurchases();

        await RC.configure({
          apiKey,
          appUserID: user?.id?.toString() ?? null,
        });

        const [{ customerInfo }, offerings] = await Promise.all([
          RC.getCustomerInfo(),
          loadOfferings(RC),
        ]);

        if (cancelled) return;

        const isPro =
          Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;

        setState({
          available: true,
          loading: false,
          offerings,
          customerInfo,
          error: null,
          isPro,
        });

        await syncPlanToBackend(customerInfo);
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            available: false,
            error: String(err),
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative, platform, user?.id, loadOfferings, syncPlanToBackend]);

  const purchase = useCallback(
    async (pkg: IAPPackage) => {
      const RC = await getPurchases();
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { customerInfo } = await RC.purchasePackage({
          aPackage: pkg.rcPackage,
        });
        const isPro =
          Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
        setState((s) => ({
          ...s,
          loading: false,
          customerInfo,
          isPro,
        }));
        await syncPlanToBackend(customerInfo);
      } catch (err: unknown) {
        const msg = (err as { userCancelled?: boolean })?.userCancelled
          ? "キャンセルされました"
          : "購入に失敗しました";
        setState((s) => ({ ...s, loading: false, error: msg }));
        throw err;
      }
    },
    [syncPlanToBackend]
  );

  const restore = useCallback(async () => {
    const RC = await getPurchases();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { customerInfo } = await RC.restorePurchases();
      const isPro =
        Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
      setState((s) => ({
        ...s,
        loading: false,
        customerInfo,
        isPro,
      }));
      await syncPlanToBackend(customerInfo);
    } catch {
      setState((s) => ({
        ...s,
        loading: false,
        error: "購入の復元に失敗しました",
      }));
    }
  }, [syncPlanToBackend]);

  const refresh = useCallback(async () => {
    if (!isNative) return;
    const RC = await getPurchases();
    const { customerInfo } = await RC.getCustomerInfo();
    const isPro =
      Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
    setState((s) => ({ ...s, customerInfo, isPro }));
    await syncPlanToBackend(customerInfo);
  }, [isNative, syncPlanToBackend]);

  return { ...state, purchase, restore, refresh };
}
