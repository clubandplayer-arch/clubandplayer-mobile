import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { createComment, deleteComment, editComment, fetchComments, type FeedComment } from "../lib/api";

import { theme } from "../theme";
type CommentsSectionProps = {
  postId: string;
  currentUserId: string | null;
  initialCount: number;
  onCountChange?: (nextCount: number) => void;
  loadLimit?: number;
};

const EDIT_WINDOW_MS = 60 * 1000;

function getDisplayName(comment: FeedComment): string {
  const name = comment.author?.display_name || comment.author?.full_name;
  if (name && String(name).trim()) return String(name).trim();
  return "Utente";
}

function canEditComment(comment: FeedComment, currentUserId: string | null): boolean {
  if (!currentUserId) return false;
  const isOwner = currentUserId === comment.author_id || currentUserId === comment.author?.user_id;
  if (!isOwner) return false;

  const createdAtMs = Number(new Date(comment.created_at));
  if (!Number.isFinite(createdAtMs)) return false;

  return Date.now() - createdAtMs <= EDIT_WINDOW_MS;
}

function canDeleteComment(comment: FeedComment, currentUserId: string | null): boolean {
  if (!currentUserId) return false;
  return currentUserId === comment.author_id || currentUserId === comment.author?.user_id;
}

export function CommentsSection({
  postId,
  currentUserId,
  initialCount,
  onCountChange,
  loadLimit = 100,
}: CommentsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [count, setCount] = useState(initialCount);

  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);

  const previewComments = useMemo(() => comments.slice(0, 2), [comments]);

  const updateCount = (nextCount: number) => {
    const normalized = Math.max(0, nextCount);
    setCount(normalized);
    if (onCountChange) onCountChange(normalized);
  };

  const load = async () => {
    setLoading(true);
    setError(null);

    const res = await fetchComments(postId, loadLimit);
    if (!res.ok) {
      setError(res.errorText ?? `Errore caricamento commenti (${res.status})`);
      setLoading(false);
      return;
    }

    const nextComments = Array.isArray(res.data?.comments) ? res.data?.comments : [];
    setComments(nextComments);
    setHasLoaded(true);
    updateCount(Math.max(count, nextComments.length));
    setLoading(false);
  };

  const toggleExpanded = async () => {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded && !hasLoaded && !loading) {
      await load();
    }
  };

  const onCreate = async () => {
    if (!postId || submitting) return;

    const body = draft.trim();
    if (!body) return;

    setSubmitting(true);
    setError(null);

    const res = await createComment(postId, body);
    if (!res.ok || !res.data?.comment) {
      setError(res.errorText ?? `Errore creazione commento (${res.status})`);
      setSubmitting(false);
      return;
    }

    const nextComments = [...comments, res.data.comment];
    setComments(nextComments);
    setDraft("");
    setHasLoaded(true);
    updateCount(count + 1);
    setSubmitting(false);
  };

  const onStartEdit = (comment: FeedComment) => {
    setEditingCommentId(comment.id);
    setEditDraft(comment.body ?? "");
    setError(null);
  };

  const onCancelEdit = () => {
    setEditingCommentId(null);
    setEditDraft("");
  };

  const onSaveEdit = async () => {
    if (!editingCommentId || busyCommentId) return;

    const body = editDraft.trim();
    if (!body) return;

    setBusyCommentId(editingCommentId);
    setError(null);

    const res = await editComment(editingCommentId, body);
    if (!res.ok || !res.data?.comment) {
      setError(res.errorText ?? `Errore modifica commento (${res.status})`);
      setBusyCommentId(null);
      return;
    }

    setComments((prev) => prev.map((item) => (item.id === editingCommentId ? res.data!.comment : item)));
    setEditingCommentId(null);
    setEditDraft("");
    setBusyCommentId(null);
  };

  const onDelete = async (commentId: string) => {
    if (busyCommentId) return;

    setBusyCommentId(commentId);
    setError(null);

    const res = await deleteComment(commentId);
    if (!res.ok) {
      setError(res.errorText ?? `Errore eliminazione commento (${res.status})`);
      setBusyCommentId(null);
      return;
    }

    const nextComments = comments.filter((item) => item.id !== commentId);
    setComments(nextComments);
    updateCount(count - 1);

    if (editingCommentId === commentId) onCancelEdit();
    setBusyCommentId(null);
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.colors.neutral200,
        borderRadius: 14,
        padding: 16,
        gap: 12,
        backgroundColor: theme.colors.background,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.text }}>Commenti ({count})</Text>
        <Pressable onPress={toggleExpanded}>
          <Text style={{ fontWeight: "700", color: theme.colors.text }}>
            {expanded ? "Nascondi commenti" : "Mostra commenti"}
          </Text>
        </Pressable>
      </View>

      {!expanded && hasLoaded && previewComments.length > 0 ? (
        <View style={{ gap: 10 }}>
          {previewComments.map((comment) => (
            <View key={comment.id} style={{ gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>{getDisplayName(comment)}</Text>
              <Text style={{ color: theme.colors.textSoft }}>{comment.body}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {expanded ? (
        <>
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator size="small" />
              <Text style={{ color: theme.colors.muted }}>Caricamento commenti…</Text>
            </View>
          ) : comments.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>Nessun commento.</Text>
          ) : (
            <View style={{ gap: 12 }}>
              {comments.map((comment) => {
                const isEditing = editingCommentId === comment.id;
                const isBusy = busyCommentId === comment.id;
                const canEdit = canEditComment(comment, currentUserId);
                const canDelete = canDeleteComment(comment, currentUserId);

                return (
                  <View key={comment.id} style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.neutral100, paddingBottom: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.text }}>{getDisplayName(comment)}</Text>

                    {isEditing ? (
                      <View style={{ gap: 8 }}>
                        <TextInput
                          value={editDraft}
                          onChangeText={setEditDraft}
                          multiline
                          placeholder="Modifica commento"
                          style={{
                            borderWidth: 1,
                            borderColor: theme.colors.borderSubtle,
                            borderRadius: 10,
                            padding: 10,
                            minHeight: 44,
                            color: theme.colors.text,
                          }}
                        />
                        <View style={{ flexDirection: "row", gap: 12 }}>
                          <Pressable onPress={onSaveEdit} disabled={isBusy || !editDraft.trim()}>
                            <Text style={{ color: isBusy ? theme.colors.mutedSoft : theme.colors.text, fontWeight: "700" }}>Salva</Text>
                          </Pressable>
                          <Pressable onPress={onCancelEdit} disabled={isBusy}>
                            <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>Annulla</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Text style={{ color: theme.colors.textSoft }}>{comment.body}</Text>
                    )}

                    {!isEditing && (canEdit || canDelete) ? (
                      <View style={{ flexDirection: "row", gap: 14 }}>
                        {canEdit ? (
                          <Pressable onPress={() => onStartEdit(comment)} disabled={isBusy}>
                            <Text style={{ color: isBusy ? theme.colors.mutedSoft : theme.colors.text, fontWeight: "700" }}>Modifica</Text>
                          </Pressable>
                        ) : null}
                        {canDelete ? (
                          <Pressable onPress={() => onDelete(comment.id)} disabled={isBusy}>
                            <Text style={{ color: isBusy ? theme.colors.mutedSoft : theme.colors.danger, fontWeight: "700" }}>Elimina</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ gap: 8 }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Scrivi un commento"
              multiline
              style={{
                borderWidth: 1,
                borderColor: theme.colors.borderSubtle,
                borderRadius: 10,
                padding: 10,
                minHeight: 44,
                color: theme.colors.text,
              }}
            />
            <Pressable
              onPress={onCreate}
              disabled={submitting || !draft.trim()}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                backgroundColor: submitting || !draft.trim() ? theme.colors.borderSubtle : theme.colors.text,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: theme.colors.background, fontWeight: "700" }}>
                {submitting ? "Invio…" : "Commenta"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}

      {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
    </View>
  );
}
