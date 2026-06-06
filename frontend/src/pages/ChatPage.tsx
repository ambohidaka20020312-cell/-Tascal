import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useChannels, useChat } from "../hooks/useChat";
import { useOrgMembers } from "../hooks/useOrg";
import { useOrg } from "../hooks/useOrg";
import api from "../utils/api";
import type { Channel, Message, Attachment } from "../types/team";

// ── Upsell screen for non-team plans ─────────────────────────────────────────

function ChatUpsell() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6 px-4">
      <div className="text-5xl">💬</div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">
        チームチャット
      </h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-md">
        法人プランにアップグレードすると、部署別チャンネル・ダイレクトメッセージ・メッセージからのタスク作成など、チームチャット機能が使えます。
      </p>
      <Link
        to="/plans"
        className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-80 transition-opacity"
      >
        プランを確認する
      </Link>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] shrink-0">
      {initials || "?"}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.mime_type.startsWith("image/");
  if (isImage) {
    return (
      <img
        src={attachment.url}
        alt={attachment.filename}
        className="max-w-xs max-h-48 rounded-lg cursor-pointer object-cover"
        onClick={() => window.open(attachment.url, "_blank")}
      />
    );
  }
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-sm hover:opacity-70"
    >
      📄 {attachment.filename}
      <span className="text-xs text-[var(--text-secondary)]">
        {formatFileSize(attachment.size)}
      </span>
    </a>
  );
}

// ── Message → Task modal ──────────────────────────────────────────────────────

interface ToTaskModalProps {
  message: Message;
  channelId: number;
  orgId: number;
  onClose: () => void;
}

function ToTaskModal({ message, channelId, orgId, onClose }: ToTaskModalProps) {
  const { data: members = [] } = useOrgMembers(orgId);
  const [title, setTitle] = useState(message.body);
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api.post(
        `/channels/${channelId}/messages/${message.id}/to-task`,
        {
          title: title.trim(),
          assignee_id: assigneeId || undefined,
          due_date: dueDate || undefined,
        }
      );
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            📋 タスクを作成
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">タスクタイトル</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--text-muted)]"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">担当者</label>
            <select
              value={assigneeId}
              onChange={(e) =>
                setAssigneeId(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)]"
            >
              <option value="">未割り当て</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[var(--text-secondary)] mb-1 block">期限</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)]"
            />
          </div>

          <button
            type="submit"
            disabled={!title.trim() || loading}
            className="w-full py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {loading ? "作成中..." : "タスク作成"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Message item ──────────────────────────────────────────────────────────────

interface MessageItemProps {
  message: Message;
  channelId: number;
  orgId: number;
  currentUserId: number;
}

function MessageItem({ message, channelId, orgId, currentUserId }: MessageItemProps) {
  const [hovered, setHovered] = useState(false);
  const [showToTask, setShowToTask] = useState(false);
  const isOwn = message.sender_id === currentUserId;

  return (
    <>
      <div
        className={`flex gap-3 group relative ${isOwn ? "flex-row-reverse" : ""}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <InitialsAvatar name={message.sender_name} />
        <div className={`flex flex-col max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}>
          <div className="flex items-baseline gap-2 mb-1">
            {!isOwn && (
              <span className="text-xs font-medium text-[var(--text-primary)]">
                {message.sender_name}
              </span>
            )}
            <span className="text-[10px] text-[var(--text-secondary)]">
              {formatTime(message.created_at)}
            </span>
          </div>
          <div
            className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
              isOwn
                ? "bg-[var(--accent)] text-white rounded-tr-sm"
                : "bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm"
            }`}
          >
            {message.body}
          </div>
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {message.attachments.map((att, i) => (
                <AttachmentPreview key={i} attachment={att} />
              ))}
            </div>
          )}
          {message.task_id && (
            <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-secondary)]">
              📋 タスク: #{message.task_id}
            </span>
          )}
        </div>

        {/* Hover action */}
        {hovered && (
          <button
            onClick={() => setShowToTask(true)}
            className="absolute top-0 right-0 text-[10px] px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap z-10"
            style={{ [isOwn ? "left" : "right"]: 0, right: "auto" }}
          >
            📋 タスクにする
          </button>
        )}
      </div>

      {showToTask && (
        <ToTaskModal
          message={message}
          channelId={channelId}
          orgId={orgId}
          onClose={() => setShowToTask(false)}
        />
      )}
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  channels: Channel[];
  activeChannelId: number | null;
  onSelectChannel: (id: number) => void;
  teamName: string;
}

function ChatSidebar({ channels, activeChannelId, onSelectChannel, teamName }: SidebarProps) {
  const groups = channels.filter((c) => c.channel_type === "group");
  const dms = channels.filter((c) => c.channel_type === "dm");

  return (
    <div
      className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border)]"
      style={{ width: 240, minWidth: 240 }}
    >
      {/* Team name */}
      <div className="px-4 py-4 border-b border-[var(--border)]">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide truncate">
          {teamName}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Group channels */}
        <div className="px-3 mb-1">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1 mb-1">
            チャンネル
          </p>
          {groups.map((ch) => (
            <button
              key={ch.id}
              onClick={() => onSelectChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
                activeChannelId === ch.id
                  ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span className="text-[var(--text-secondary)]">#</span>
              <span className="flex-1 truncate">{ch.name}</span>
              {ch.unread_count ? (
                <span className="text-[10px] bg-[var(--accent)] text-white rounded-full px-1.5 py-0.5">
                  {ch.unread_count}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* DMs */}
        {dms.length > 0 && (
          <div className="px-3 mt-3">
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider px-1 mb-1">
              ダイレクトメッセージ
            </p>
            {dms.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onSelectChannel(ch.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left ${
                  activeChannelId === ch.id
                    ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <span className="flex-1 truncate">{ch.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create channel */}
      <div className="px-3 py-3 border-t border-[var(--border)]">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors text-left">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          チャンネル作成
        </button>
      </div>
    </div>
  );
}

// ── Main chat area ────────────────────────────────────────────────────────────

interface ChatAreaProps {
  channelId: number;
  channelName: string;
  orgId: number;
  currentUserId: number;
}

function ChatArea({ channelId, channelName, orgId, currentUserId }: ChatAreaProps) {
  const { messages, sendMessage, uploadFile, isConnected } = useChat(channelId);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;
      setUploading(true);
      try {
        for (const file of fileArr) {
          await uploadFile(file);
        }
      } finally {
        setUploading(false);
      }
    },
    [uploadFile]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData.files;
    if (files && files.length > 0) {
      e.preventDefault();
      handleFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`flex flex-col flex-1 h-full bg-[var(--bg-primary)] relative ${
        isDragOver ? "border-2 border-dashed border-[var(--accent)]" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-primary)]/80 pointer-events-none">
          <p className="text-sm font-medium text-[var(--accent)]">ファイルをドロップしてアップロード</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <span className="text-[var(--text-secondary)]">#</span>
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{channelName}</h2>
        <span
          className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${
            isConnected
              ? "bg-green-500/20 text-green-600"
              : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
          }`}
        >
          {isConnected ? "接続中" : "オフライン"}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[var(--text-secondary)] pt-12">
            まだメッセージがありません。最初のメッセージを送ってみましょう！
          </p>
        )}
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            channelId={channelId}
            orgId={orgId}
            currentUserId={currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.zip"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]"
      >
        <div className="flex items-end gap-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-40"
            aria-label="ファイルを添付"
          >
            {uploading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
              }
            }}
            onPaste={handlePaste}
            rows={1}
            placeholder={`#${channelName} にメッセージを送る`}
            className="flex-1 bg-transparent resize-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--accent)] text-white disabled:opacity-40 hover:opacity-80 transition-opacity"
            aria-label="送信"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const { data: channels = [], isLoading } = useChannels();
  const { data: org } = useOrg();

  const [activeChannelId, setActiveChannelId] = useState<number | null>(null);

  // Plan gate
  const effectivePlan = user?.effective_plan ?? user?.plan ?? "free";
  const hasTeamAccess = effectivePlan === "team" || effectivePlan === "enterprise" || effectivePlan === "business";

  if (!hasTeamAccess) {
    return <ChatUpsell />;
  }

  // Auto-select first channel
  const firstChannelId = channels[0]?.id ?? null;
  const resolvedChannelId = activeChannelId ?? firstChannelId;
  const activeChannel = channels.find((c) => c.id === resolvedChannelId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border border-[var(--border)] border-t-[var(--text-secondary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-[var(--content-padding-x)] -my-[var(--content-padding-y)] overflow-hidden">
      <ChatSidebar
        channels={channels}
        activeChannelId={resolvedChannelId}
        onSelectChannel={setActiveChannelId}
        teamName={org?.name ?? "チーム"}
      />

      {resolvedChannelId && activeChannel ? (
        <ChatArea
          channelId={resolvedChannelId}
          channelName={activeChannel.name}
          orgId={org?.id ?? 0}
          currentUserId={user?.id ?? 0}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
          チャンネルを選択してください
        </div>
      )}
    </div>
  );
}
