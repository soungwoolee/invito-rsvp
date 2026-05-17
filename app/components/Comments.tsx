"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, type Comment, type Rsvp } from "@/lib/supabase";

type Props = {
  eventId: string;
  guestName: string;
  rsvps: Rsvp[];
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

function getGuestInfo(name: string, rsvps: Rsvp[]) {
  const rsvp = rsvps.find((r) => r.guest_name === name);
  return {
    avatar: rsvp?.avatar || null,
    photoUrl: rsvp?.photo_url || null,
  };
}

function Avatar({ name, rsvps }: { name: string; rsvps: Rsvp[] }) {
  const info = getGuestInfo(name, rsvps);
  if (info.photoUrl) {
    return (
      <img
        src={info.photoUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-card-border flex-shrink-0"
      />
    );
  }
  if (info.avatar) {
    return (
      <div className="w-8 h-8 rounded-full bg-card border border-card-border flex items-center justify-center text-base flex-shrink-0">
        {info.avatar}
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
      {name.charAt(0)}
    </div>
  );
}

type CommentWithReplies = Comment & { parent_id: number | null };

export default function Comments({ eventId, guestName, rsvps }: Props) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (data) setComments(data as CommentWithReplies[]);
  }, [eventId]);

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`comments_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `event_id=eq.${eventId}` },
        () => fetchComments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, fetchComments]);

  async function handlePost() {
    if (!newComment.trim() || !guestName) return;
    setPosting(true);
    await supabase.from("comments").insert({
      event_id: eventId,
      guest_name: guestName,
      content: newComment.trim(),
      parent_id: null,
    });
    setNewComment("");
    setPosting(false);
    fetchComments();
  }

  async function handleReply(parentId: number) {
    if (!replyContent.trim() || !guestName) return;
    await supabase.from("comments").insert({
      event_id: eventId,
      guest_name: guestName,
      content: replyContent.trim(),
      parent_id: parentId,
    });
    setReplyContent("");
    setReplyingTo(null);
    fetchComments();
  }

  async function handleEdit(id: number) {
    if (!editContent.trim()) return;
    await supabase.from("comments").update({ content: editContent.trim() }).eq("id", id);
    setEditingId(null);
    setEditContent("");
    fetchComments();
  }

  async function handleDelete(id: number) {
    await supabase.from("comments").delete().eq("parent_id", id);
    await supabase.from("comments").delete().eq("id", id);
    fetchComments();
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: number) => comments.filter((c) => c.parent_id === parentId);

  function renderComment(c: CommentWithReplies, isReply = false) {
    const isMine = c.guest_name === guestName;
    const childReplies = isReply ? [] : replies(c.id);

    return (
      <div key={c.id} className={isReply ? "ml-10" : ""}>
        <div className="flex gap-2.5">
          <Avatar name={c.guest_name} rsvps={rsvps} />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold">{c.guest_name}</span>
              <span className="text-[10px] text-muted">{timeAgo(c.created_at)}</span>
            </div>

            {editingId === c.id ? (
              <div className="flex gap-2 mt-1">
                <input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 bg-input-bg border border-input-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-accent transition-all"
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(c.id)}
                />
                <button onClick={() => handleEdit(c.id)} className="text-xs text-accent font-bold">저장</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-muted">취소</button>
              </div>
            ) : (
              <p className="text-sm text-foreground/85 mt-0.5 break-words">{c.content}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-1">
              {!isReply && guestName && (
                <button
                  onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyContent(""); }}
                  className="text-[10px] text-muted hover:text-accent font-medium transition-colors"
                >
                  답글
                </button>
              )}
              {isMine && editingId !== c.id && (
                <>
                  <button
                    onClick={() => { setEditingId(c.id); setEditContent(c.content); }}
                    className="text-[10px] text-muted hover:text-accent font-medium transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-[10px] text-muted hover:text-error font-medium transition-colors"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>

            {/* Reply input */}
            {replyingTo === c.id && (
              <div className="flex gap-2 mt-2">
                <input
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`${c.guest_name}에게 답글...`}
                  maxLength={200}
                  onKeyDown={(e) => e.key === "Enter" && handleReply(c.id)}
                  className="flex-1 bg-input-bg border border-input-border rounded-lg px-2.5 py-1.5 text-sm placeholder:text-muted-light focus:outline-none focus:border-accent transition-all"
                />
                <button
                  onClick={() => handleReply(c.id)}
                  disabled={!replyContent.trim()}
                  className="text-xs text-accent font-bold disabled:opacity-40"
                >
                  전송
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Child replies */}
        {childReplies.length > 0 && (
          <div className="flex flex-col gap-3 mt-3">
            {childReplies.map((r) => renderComment(r, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5">
      <p className="text-xs font-bold tracking-wider text-muted uppercase mb-4">
        한마디
      </p>

      {guestName ? (
        <div className="flex gap-2.5 mb-4">
          <Avatar name={guestName} rsvps={rsvps} />
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="기대되는 거, 하고 싶은 말..."
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              className="flex-1 bg-input-bg border border-input-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-light focus:outline-none focus:border-accent transition-all"
            />
            <button
              onClick={handlePost}
              disabled={posting || !newComment.trim()}
              className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold"
            >
              {posting ? "..." : "전송"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-muted text-xs mb-4">RSVP 후 댓글을 남길 수 있어요</p>
      )}

      {comments.length === 0 ? (
        <p className="text-muted text-sm text-center py-3">
          아직 댓글이 없어요. 첫 번째로 남겨보세요!
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {topLevel.map((c) => renderComment(c))}
        </div>
      )}
    </div>
  );
}
