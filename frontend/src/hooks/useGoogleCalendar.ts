import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../utils/api";

interface GoogleCalendarStatus {
  connected: boolean;
  sync_enabled: boolean;
}

export function useGoogleCalendarStatus() {
  return useQuery<GoogleCalendarStatus>({
    queryKey: ["googleCalendarStatus"],
    queryFn: async () => {
      const res = await api.get("/integrations/google/status");
      return res.data.data as GoogleCalendarStatus;
    },
    staleTime: 30_000,
  });
}

export function useGoogleCalendar() {
  const queryClient = useQueryClient();

  const connect = async () => {
    const res = await api.get("/integrations/google/auth");
    const url: string = res.data.data.authorization_url;
    window.location.href = url;
  };

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await api.delete("/integrations/google");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["googleCalendarStatus"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/integrations/google/sync");
      return res.data.data as { synced: number; errors: number };
    },
  });

  return {
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    sync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
  };
}
