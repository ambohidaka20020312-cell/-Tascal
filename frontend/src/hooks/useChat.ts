import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import api from "../utils/api";
import type { Channel, Message } from "../types/team";

// ── Channel list ──────────────────────────────────────────────────────────────

export function useChannels() {
  return useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await api.get("/channels");
      return (res.data as { data: Channel[] }).data ?? [];
    },
  });
}

// ── Messages + Socket.IO ──────────────────────────────────────────────────────

export function useChat(channelId: number | null) {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initial message fetch
  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await api.get(`/channels/${channelId}/messages`);
      return (res.data as { data: Message[] }).data ?? [];
    },
    enabled: channelId != null,
  });

  // Socket.IO connection
  useEffect(() => {
    if (!channelId) return;

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL?.replace("/api/v1", "") ?? "";
    const token = localStorage.getItem("access_token");

    const socket = io(baseUrl, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    socket.emit("join_channel", { channel_id: channelId });

    socket.on("new_message", (msg: Message) => {
      qc.setQueryData<Message[]>(["messages", channelId], (prev = []) => {
        // Avoid duplicate if optimistic update already added it
        const exists = prev.some((m) => m.id === msg.id);
        if (exists) {
          // Replace the temp optimistic message
          return prev.map((m) => (m.id < 0 ? msg : m));
        }
        return [...prev, msg];
      });
    });

    return () => {
      socket.emit("leave_channel", { channel_id: channelId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [channelId, qc]);

  const sendMessage = useCallback(
    async (body: string) => {
      if (!channelId || !body.trim()) return;

      // Optimistic update with temp negative id
      const tempMsg: Message = {
        id: -Date.now(),
        channel_id: channelId,
        sender_id: 0,
        sender_name: "送信中...",
        body,
        task_id: null,
        created_at: new Date().toISOString(),
      };

      qc.setQueryData<Message[]>(["messages", channelId], (prev = []) => [
        ...prev,
        tempMsg,
      ]);

      try {
        await api.post(`/channels/${channelId}/messages`, { body });
        // Real message will arrive via socket or we can refetch
      } catch {
        // Remove optimistic message on error
        qc.setQueryData<Message[]>(["messages", channelId], (prev = []) =>
          prev.filter((m) => m.id !== tempMsg.id)
        );
      }
    },
    [channelId, qc]
  );

  const uploadFile = async (_file: File) => {
    // File upload via R2 — not yet implemented
  };

  return { messages, sendMessage, uploadFile, isConnected };
}
