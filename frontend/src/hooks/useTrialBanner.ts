import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../utils/api";
import { useAuthStore } from "../store/authStore";
import analytics from "../utils/analytics";

export function useTrialBanner() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const startTrialMutation = useMutation({
    mutationFn: () => authApi.startTrial(),
    onSuccess: (res) => {
      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        updateUser(updatedUser);
      }
      queryClient.invalidateQueries({ queryKey: ["me"] });
      analytics.track("trial_started");
    },
  });

  const isTrialActive = user?.trial_active ?? false;
  const trialDaysLeft = user?.trial_days_left ?? 0;
  const isFree = (user?.plan ?? "free") === "free";
  const trialUsed = !isTrialActive && isFree && !!user && (user as { trial_used?: boolean }).trial_used;

  return {
    isTrialActive,
    trialDaysLeft,
    isFree,
    trialUsed,
    startTrial: startTrialMutation.mutate,
    isLoading: startTrialMutation.isPending,
    error: startTrialMutation.error,
  };
}
