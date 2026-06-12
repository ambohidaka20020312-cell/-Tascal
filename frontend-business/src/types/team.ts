export interface Team {
  id: number;
  name: string;
  plan: "team" | "enterprise";
  max_seats: number;
}

export interface TeamMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export interface Department {
  id: number;
  team_id: number;
  name: string;
}

export interface Channel {
  id: number;
  name: string;
  channel_type: "group" | "dm";
  department_id: number | null;
  unread_count?: number;
}

export interface Attachment {
  id: string;
  name: string;
  filename: string;
  url: string;
  mime_type: string;
  size: number;
}

export interface Message {
  id: number;
  channel_id: number;
  sender_id: number;
  sender_name: string;
  body: string;
  task_id: number | null;
  mentions?: { type: string; id: number; name: string }[];
  message_type?: string;
  attachments?: Attachment[];
  created_at: string;
  updated_at?: string;
}
