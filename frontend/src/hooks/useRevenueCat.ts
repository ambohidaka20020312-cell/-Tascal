import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Purchases, LOG_LEVEL, PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { useAuthStore } from "../store/authStore";

interface CustomerInfo {
  entitlements: {
    active: Record<string, unknown>;
  };
}

function getJapaneseError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("cancel") || msg.includes("cancelled")) {
      return "購入がキャンセルされました。";
    }
    if (msg.includes("network") || msg.includes("connection")) {
      return "ネットワークエラーが発生しました。接続を確認してください。";
    }
    if (msg.includes("not allowed") || msg.includes("permission")) {
      return "購入が許可されていません。設定を確認してください。";
    }
    if (msg.includes("already") || msg.includes("owned")) {
      return "このプランはすでに購入済みです。";
    }
    if (msg.includes("invalid") || msg.includes("product")) {
      return "商品情報の取得に失敗しました。しばらく経ってから再試行してください。";
    }
  }
  return "購入処理中にエラーが発生しました。しばらく経ってから再試行してください。";
}

export function useRevenueCat() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  const isPro =
    customerInfo != null &&
    "pro" in customerInfo.entitlements.active;

  useEffect(() => {
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY;
    if (!apiKey || Capacitor.getPlatform() !== "ios" || !user) return;

    (async () => {
      try {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
        await Purchases.configure({
          apiKey,
          appUserID: user.id.toString(),
        });

        const { customerInfo: info } = await Purchases.getCustomerInfo();
        setCustomerInfo(info as unknown as CustomerInfo);

        const { current } = await Purchases.getOfferings();
        if (current?.availablePackages) {
          setPackages(current.availablePackages);
        }
      } catch (err) {
        setError(getJapaneseError(err));
      }
    })();
  }, [user]);

  const purchasePro = async (): Promise<void> => {
    const proPackage = packages.find(
      (p) =>
        p.packageType === "MONTHLY" ||
        p.identifier.toLowerCase().includes("pro")
    );
    if (!proPackage) {
      setError("Proプランの商品情報が見つかりませんでした。");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { customerInfo: info } = await Purchases.purchasePackage({
        aPackage: proPackage,
      });
      const typedInfo = info as unknown as CustomerInfo;
      setCustomerInfo(typedInfo);
      if ("pro" in typedInfo.entitlements.active) {
        updateUser({ plan: "personal_pro" });
      }
    } catch (err) {
      setError(getJapaneseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const restorePurchases = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { customerInfo: info } = await Purchases.restorePurchases();
      const typedInfo = info as unknown as CustomerInfo;
      setCustomerInfo(typedInfo);
      if ("pro" in typedInfo.entitlements.active) {
        updateUser({ plan: "personal_pro" });
      }
    } catch (err) {
      setError(getJapaneseError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    packages,
    isLoading,
    error,
    purchasePro,
    restorePurchases,
    customerInfo,
    isPro,
  };
}
