import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { offlineQueue } from "../utils/offlineQueue";

export function useOfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (navigator.onLine && offlineQueue.getAll().length > 0) {
      offlineQueue.flush().then(() => {
        queryClient.invalidateQueries();
      });
    }

    const handleOnline = () => {
      offlineQueue.flush().then(() => {
        queryClient.invalidateQueries();
      });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [queryClient]);
}
