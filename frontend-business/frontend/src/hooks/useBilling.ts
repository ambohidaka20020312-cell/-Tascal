import { useQuery, useMutation } from "@tanstack/react-query";
import { billingApi } from "../utils/api";

export interface Subscription {
  plan: "free" | "pro" | "team" | "personal_pro" | "business" | "enterprise";
  status: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  trial_used?: boolean;
}

export function useSubscription() {
  return useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await billingApi.getSubscription();
      return res.data.data as Subscription;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (plan: "pro" | "team" | "personal_pro" | "business" | "enterprise") => {
      const successUrl = `${window.location.origin}/app/subscription?success=true`;
      const cancelUrl = `${window.location.origin}/app/subscription?canceled=true`;
      const res = await billingApi.createCheckout(plan, successUrl, cancelUrl);
      return res.data.data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}

export function usePortal() {
  return useMutation({
    mutationFn: async () => {
      const returnUrl = `${window.location.origin}/app/subscription`;
      const res = await billingApi.getPortal(returnUrl);
      return res.data.data as { url: string };
    },
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });
}
