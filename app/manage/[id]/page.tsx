"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase, formatPhone, type Event, type Rsvp } from "@/lib/supabase";
import GuestManager from "@/app/components/GuestManager";
import Activities from "@/app/components/Activities";
import Comments from "@/app/components/Comments";

type AuthState = "checking" | "authenticated" | "needs_login";

export default function ManagePage() {
  const params = useParams();
  const eventId = params.id as string;

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);

  const [loginPhone, setLoginPhone] = useState("");
  const [loginKey, setLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  const comingCount = rsvps.filter((r) => r.is_coming === true).length;
  const maybeCount = rsvps.filter((r) => r.is_coming === null).length;
  const notComingCount = rsvps.filter((r) => r.is_coming === false).length;

  const fetchRsvps = useCallback(async () => {
    const { data } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (data) setRsvps(data);
  }, [eventId]);

  const verifyAndAuthenticate = useCallback(
    async (phone: string, key: string) => {
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("host_phone", phone)
        .eq("host_key", key)
        .single();

      if (data) {
        setEvent(data);
        localStorage.setItem(`invito_phone_${eventId}`, phone);
        localStorage.setItem(`invito_key_${eventId}`, key);
        setAuthState("authenticated");
        return true;
      }
      return false;
    },
    [eventId]
  );

  useEffect(() => {
    async function checkAuth() {
      const storedPhone = localStorage.getItem(`invito_phone_${eventId}`);
      const storedKey = localStorage.getItem(`invito_key_${eventId}`);

      if (storedPhone && storedKey) {
        const ok = await verifyAndAuthenticate(storedPhone, storedKey);
        if (!ok) {
          localStorage.removeItem(`invito_phone_${eventId}`);
          localStorage.removeItem(`invito_key_${eventId}`);
          setAuthState("needs_login");
        }
      } else {
        setAuthState("needs_login");
      }
    }
    checkAuth();
  }, [eventId, verifyAndAuthenticate]);

  useEffect(() => {
    if (authState !== "authenticated") return;
    fetchRsvps();

    const channel = supabase
      .channel(`rsvps_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => fetchRsvps()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authState, eventId, fetchRsvps]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    const ok = await verifyAndAuthenticate(loginPhone.replace(/-/g, ""), loginKey);
    if (!ok) {
      setLoginError("전화번호 또는 Key가 맞지 않습니다.");
    }
    setLoginLoading(false);
  }

  async function handleDeleteRsvp(rsvpId: number) {
    await supabase.from("rsvps").delete().eq("id", rsvpId);
    fetchRsvps();
  }

  function handleCopyGuestLink() {
    const guestUrl = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(guestUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (authState === "checking") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm animate-pulse">확인 중...</div>
      </main>
    );
  }

  if (authState === "needs_login") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="text-2xl font-black tracking-widest gradient-text">INVITO</span>
              <span className="bg-accent/20 text-accent text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider border border-accent/30">HOST</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight">관리자 로그인</h1>
            <p className="text-muted text-sm mt-2">
              이벤트를 만들 때 입력했던 정보를 입력하세요
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
                전화번호
              </label>
              <input
                value={loginPhone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  if (formatted.replace(/-/g, "").length <= 11) setLoginPhone(formatted);
                }}
                required
                type="tel"
                inputMode="numeric"
                placeholder="01012345678"
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <p className="text-[10px] text-muted-light mt-1">- 없이 숫자만 입력하세요</p>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
                나만의 Key
              </label>
              <input
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                required
                placeholder="등록한 Key를 입력하세요"
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>

            {loginError && (
              <div className="bg-error/10 border border-error/30 text-error text-sm px-4 py-3 rounded-xl">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="mt-2 btn-primary font-bold text-base py-4 rounded-xl tracking-wide"
            >
              {loginLoading ? "확인 중..." : "대시보드 열기 →"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-10">
      <div className="max-w-md mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="text-xl font-black tracking-widest gradient-text">INVITO</span>
            <span className="bg-accent/20 text-accent text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider border border-accent/30">HOST</span>
          </div>

          {event?.image_url && (
            <div className="w-full h-40 rounded-2xl overflow-hidden mb-4 ring-1 ring-card-border">
              <img src={event.image_url} alt="event cover" className="w-full h-full object-cover" />
            </div>
          )}

          <h1 className="text-2xl font-bold leading-snug">{event?.title}</h1>
          <div className="flex flex-col gap-1 mt-2">
            <p className="text-muted text-sm">{event?.date}</p>
            {event?.location && <p className="text-muted text-sm">{event.location.split("||")[0]}</p>}
            {event?.host_name && <p className="text-muted text-sm">주최 · {event.host_name}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-2xl p-4 text-center animate-glow">
            <div className="text-3xl font-black text-brand-blue">{comingCount}</div>
            <div className="text-xs font-bold tracking-wider text-muted uppercase mt-1">참석</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-accent">{maybeCount}</div>
            <div className="text-xs font-bold tracking-wider text-muted uppercase mt-1">미정</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-muted">{notComingCount}</div>
            <div className="text-xs font-bold tracking-wider text-muted uppercase mt-1">불참</div>
          </div>
        </div>

        {/* Copy Guest Link */}
        <button
          onClick={handleCopyGuestLink}
          className={`w-full font-bold text-base py-4 rounded-xl tracking-wide active:scale-[0.98] transition-all mb-6 ${
            copied
              ? "bg-success/20 text-success border border-success/30"
              : "btn-primary"
          }`}
        >
          {copied ? "링크 복사됨 ✓" : "게스트 링크 복사하기"}
        </button>

        {/* Guest Link Preview */}
        <div className="glass rounded-xl px-4 py-3 mb-6 overflow-hidden">
          <p className="text-[10px] font-bold text-muted tracking-wider uppercase mb-1">게스트 링크</p>
          <p className="text-xs text-foreground/70 font-mono truncate">
            {typeof window !== "undefined" ? `${window.location.origin}/event/${eventId}` : `/event/${eventId}`}
          </p>
        </div>

        {/* Guest Manager + Reminders */}
        <div className="mb-6">
          <GuestManager eventId={eventId} />
        </div>

        {/* RSVP List */}
        <div>
          <h2 className="text-xs font-bold tracking-wider text-muted uppercase mb-3">
            응답 목록 ({rsvps.length})
          </h2>

          {rsvps.length === 0 ? (
            <div className="border border-dashed border-card-border rounded-2xl py-10 text-center">
              <p className="text-muted text-sm">아직 응답이 없습니다</p>
              <p className="text-muted-light text-xs mt-1">게스트 링크를 공유하세요</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {rsvps.map((rsvp) => (
                <div key={rsvp.id} className="glass rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          rsvp.is_coming === true ? "bg-brand-blue" :
                          rsvp.is_coming === null ? "bg-accent" : "bg-muted-light"
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{rsvp.guest_name}</span>
                          <span className={`text-xs ${
                            rsvp.is_coming === true ? "text-brand-blue" :
                            rsvp.is_coming === null ? "text-accent" : "text-muted"
                          }`}>
                            {rsvp.is_coming === true ? "참석" : rsvp.is_coming === null ? "미정" : "불참"}
                          </span>
                        </div>
                        {rsvp.phone && (
                          <p className="text-[10px] text-muted-light font-mono mt-0.5">{rsvp.phone}</p>
                        )}
                        {((rsvp.plus_one_count ?? 0) > 0 || (rsvp.companion_names && rsvp.companion_names.trim())) && (
                          <p className="text-[10px] text-muted mt-1">
                            동반 {(rsvp.plus_one_count ?? 0) > 0 ? `${rsvp.plus_one_count}명` : "—"}
                            {rsvp.companion_names?.trim() ? ` · ${rsvp.companion_names.trim()}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteRsvp(rsvp.id)}
                      className="text-muted-light hover:text-error text-xs px-2 py-1 transition-colors shrink-0"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activities — host can participate */}
        <div className="mt-6">
          <Activities eventId={eventId} guestName={event?.host_name || "호스트"} isHost />
        </div>

        {/* Comments — host can comment */}
        <div className="mt-6">
          <Comments eventId={eventId} guestName={event?.host_name || "호스트"} rsvps={rsvps} />
        </div>

        <div className="mt-8 pt-6 border-t border-card-border text-center">
          <a
            href="/create"
            className="text-xs text-muted hover:text-accent underline underline-offset-4 transition-colors"
          >
            + 새 이벤트 만들기
          </a>
        </div>
      </div>
    </main>
  );
}
