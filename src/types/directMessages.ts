export type DirectMessageAuthor = {
  id?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type DirectMessage = {
  id: string;
  content: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  created_at: string;
  updated_at?: string | null;
  read_at?: string | null;
  sender?: DirectMessageAuthor | null;
  recipient?: DirectMessageAuthor | null;
};

export type DirectThreadPeer = {
  id: string;
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type DirectThreadSummary = {
  otherProfileId: string;
  otherFullName?: string | null;
  otherDisplayName?: string | null;
  otherAvatarUrl?: string | null;
  hasUnread: boolean;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  other?: DirectThreadPeer | null;
  last_message?: string | null;
  last_message_at?: string | null;
  has_unread?: boolean;
  other_profile_id?: string;
  other_full_name?: string | null;
  other_display_name?: string | null;
  other_avatar_url?: string | null;
};

export type DirectThreadResponse = {
  messages: DirectMessage[];
  peer: DirectThreadPeer | null;
  currentProfileId: string;
};

export type DirectMessageThreadsResponse = {
  ok: true;
  threads: DirectThreadSummary[];
};

export type DirectMessagePostResponse = {
  ok: true;
  message: DirectMessage;
};

export type DirectMessageMarkReadResponse = {
  ok: true;
  warning?: string;
};

export type DirectMessagesUnreadCountResponse = {
  ok: true;
  unreadThreads: number;
};
