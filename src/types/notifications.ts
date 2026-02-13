export type NotificationActor = {
  id: string;
  account_type: string | null;
  avatar_url: string | null;
  public_name: string | null;
};

export type NotificationWithActor = {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  read_at: string | null;
  read: boolean;
  actor_profile_id: string | null;
  recipient_profile_id: string | null;
  actor: NotificationActor | null;
};
