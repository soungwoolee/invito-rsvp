"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, type Activity, type ActivityLike } from "@/lib/supabase";

type Props = {
  eventId: string;
  guestName: string;
  isHost?: boolean;
};

const REACTIONS = ["❤️", "🔥", "😍", "🎉", "👏", "😂", "🤩", "💯"];

export default function Activities({ eventId, guestName, isHost }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [likes, setLikes] = useState<ActivityLike[]>([]);
  const [newActivity, setNewActivity] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openReaction, setOpenReaction] = useState<number | null>(null);
  const reactionRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    const [{ data: acts }, { data: lks }] = await Promise.all([
      supabase
        .from("activities")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      supabase
        .from("activity_likes")
        .select("*"),
    ]);
    if (acts) setActivities(acts);
    if (lks) setLikes(lks);
  }, [eventId]);

  useEffect(() => {
    fetchData();

    const ch1 = supabase
      .channel(`activities_${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities", filter: `event_id=eq.${eventId}` }, () => fetchData())
      .subscribe();

    const ch2 = supabase
      .channel(`activity_likes_${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_likes" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [eventId, fetchData]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setOpenReaction(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAdd() {
    if (!newActivity.trim() || !guestName) return;
    setAdding(true);
    await supabase.from("activities").insert({
      event_id: eventId,
      name: newActivity.trim(),
      created_by: guestName,
    });
    setNewActivity("");
    setShowInput(false);
    setAdding(false);
    fetchData();
  }

  async function handleDeleteActivity(activityId: number) {
    await supabase.from("activity_likes").delete().eq("activity_id", activityId);
    await supabase.from("activities").delete().eq("id", activityId);
    fetchData();
  }

  async function handleReaction(activityId: number, emoji: string) {
    if (!guestName) return;
    const reactionKey = `${guestName}:${emoji}`;
    const existing = likes.find(
      (l) => l.activity_id === activityId && l.guest_name === reactionKey
    );
    if (existing) {
      await supabase.from("activity_likes").delete().eq("id", existing.id);
    } else {
      await supabase.from("activity_likes").insert({
        activity_id: activityId,
        guest_name: reactionKey,
      });
    }
    setOpenReaction(null);
    fetchData();
  }

  function getReactionCounts(activityId: number) {
    const actLikes = likes.filter((l) => l.activity_id === activityId);
    const counts: Record<string, number> = {};
    actLikes.forEach((l) => {
      const emoji = l.guest_name.split(":").pop() || "❤️";
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return counts;
  }

  function isReactedByMe(activityId: number, emoji: string) {
    const reactionKey = `${guestName}:${emoji}`;
    return likes.some(
      (l) => l.activity_id === activityId && l.guest_name === reactionKey
    );
  }

  function getTotalReactions(activityId: number) {
    return likes.filter((l) => l.activity_id === activityId).length;
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold tracking-wider text-muted uppercase">
          이런 거 하고 싶어요
        </p>
        {guestName && (
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-xs text-accent font-bold hover:text-accent-secondary transition-colors"
          >
            {showInput ? "취소" : "+ 추가"}
          </button>
        )}
      </div>

      {showInput && (
        <div className="flex gap-2 mb-4">
          <input
            value={newActivity}
            onChange={(e) => setNewActivity(e.target.value)}
            placeholder="하고 싶은 활동 입력"
            maxLength={30}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-input-bg border border-input-border rounded-xl px-3 py-2.5 text-sm placeholder:text-muted-light focus:outline-none focus:border-accent transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newActivity.trim()}
            className="btn-primary px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            {adding ? "..." : "추가"}
          </button>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-muted-light text-sm text-center py-4">
          아직 제안된 활동이 없어요
        </p>
      ) : (
        <div className="flex flex-col gap-3" ref={reactionRef}>
          {activities.map((act) => {
            const reactionCounts = getReactionCounts(act.id);
            const totalReactions = getTotalReactions(act.id);
            return (
              <div key={act.id} className="relative">
                <div className="flex items-center justify-between bg-card rounded-xl px-4 py-3 border border-card-border">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{act.name}</span>
                    {(act.created_by === guestName || isHost) && (
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="text-[10px] text-muted hover:text-error transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => guestName && handleReaction(act.id, emoji)}
                        className={`text-xs px-1.5 py-0.5 rounded-full transition-all ${
                          isReactedByMe(act.id, emoji)
                            ? "bg-accent/20 border border-accent/30"
                            : "hover:bg-card-border/50"
                        }`}
                      >
                        {emoji} {count}
                      </button>
                    ))}
                    {guestName && (
                      <button
                        onClick={() => setOpenReaction(openReaction === act.id ? null : act.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                          totalReactions === 0 ? "border border-card-border text-muted hover:border-accent/30" : "text-muted hover:text-foreground"
                        }`}
                      >
                        {totalReactions === 0 ? "+" : "+"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reaction picker */}
                {openReaction === act.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 glass rounded-xl px-2 py-1.5 flex gap-1">
                    {REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(act.id, emoji)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-card-border/50 transition-all active:scale-90 ${
                          isReactedByMe(act.id, emoji) ? "bg-accent/20" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
