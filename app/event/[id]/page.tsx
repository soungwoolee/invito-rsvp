"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase, type Rsvp } from "@/lib/supabase";
import Comments from "@/app/components/Comments";

type PublicEvent = {
  id: string;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  host_name: string | null;
  image_url: string | null;
  background_image_url: string | null;
  payment_toss_url: string | null;
  payment_details: string | null;
  punctuality_note: string | null;
  audio_url: string | null;
};

type RsvpStatus = "idle" | "submitting" | "success" | "error";
type AttendanceStatus = "going" | "maybe" | "not_going";

const REVEAL_THRESHOLD = 8;

const AVATARS = [
  "🐻", "🐰", "🦊", "🐸", "🐱", "🐶",
  "🐼", "🐨", "🦁", "🐯", "🐷", "🐮",
  "🦄", "🐙", "🦋", "🐧",
];

function parseLocation(loc: string | null): { name: string; url: string | null } {
  if (!loc) return { name: "", url: null };
  if (loc.includes("||")) {
    const [name, url] = loc.split("||");
    return { name, url };
  }
  return { name: loc, url: null };
}

function SpeakerOnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </svg>
  );
}

/**
 * 상단 · 스피커 아이콘만. `audio`는 display:none 금지(Safari/인앱 재생 이슈) — 예전처럼 sr-only 고정 1px.
 */
function InviteBgmPlayer({ audioUrl }: { audioUrl: string | null }) {
  const [unavailable, setUnavailable] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const src = (audioUrl && audioUrl.trim()) || "/invite-bgm/music.mp3";

  useEffect(() => {
    setUnavailable(false);
  }, [src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [src]);

  const toggle = () => {
    if (unavailable) return;
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => {});
    else el.pause();
  };

  return (
    <>
      <audio
        ref={audioRef}
        key={src}
        src={src}
        loop
        preload="auto"
        playsInline
        className="sr-only pointer-events-none fixed left-0 top-0 -z-10 h-px w-px overflow-hidden opacity-0"
        onError={() => setUnavailable(true)}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={unavailable}
        title={unavailable ? "재생할 음원을 불러올 수 없어요" : undefined}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-card-border/90 bg-card/90 shadow-md backdrop-blur-md transition hover:scale-105 active:scale-95 ${
          unavailable
            ? "cursor-not-allowed text-muted-light/45"
            : playing
              ? "text-brand-blue"
              : "text-muted hover:text-foreground"
        }`}
        aria-label={unavailable ? "음원 없음" : playing ? "소리 끄기" : "소리 켜기"}
      >
        {playing && !unavailable ? (
          <SpeakerOnIcon className="h-6 w-6" />
        ) : (
          <SpeakerOffIcon className="h-6 w-6" />
        )}
      </button>
    </>
  );
}

export default function EventPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [plusOneCount, setPlusOneCount] = useState(0);
  const [companionNames, setCompanionNames] = useState("");
  const [attendance, setAttendance] = useState<AttendanceStatus>("going");
  const [avatar, setAvatar] = useState("🐻");
  const [myRsvpId, setMyRsvpId] = useState<number | null>(null);
  const [status, setStatus] = useState<RsvpStatus>("idle");
  const [loginError, setLoginError] = useState("");

  const fetchRsvps = useCallback(async () => {
    const { data } = await supabase
      .from("rsvps")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (data) setRsvps(data);
  }, [eventId]);

  useEffect(() => {
    async function loadEvent() {
      const { data } = await supabase
        .from("events")
        .select(
          "id, title, date, location, description, host_name, image_url, background_image_url, payment_toss_url, payment_details, punctuality_note, audio_url"
        )
        .eq("id", eventId)
        .single();
      setEvent(data);
      setLoadingEvent(false);
    }
    loadEvent();
    fetchRsvps();

    const channel = supabase
      .channel(`event_rsvps_${eventId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rsvps", filter: `event_id=eq.${eventId}` },
        () => fetchRsvps()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchRsvps]);

  useEffect(() => {
    const savedName = localStorage.getItem(`invito_guest_name_${eventId}`);
    const savedPhone = localStorage.getItem(`invito_guest_phone_${eventId}`);
    const savedRsvpId = localStorage.getItem(`invito_rsvp_id_${eventId}`);
    const savedAvatar = localStorage.getItem(`invito_avatar_${eventId}`);
    if (savedName && savedRsvpId) {
      setGuestName(savedName);
      if (savedPhone) setGuestPhone(savedPhone);
      setMyRsvpId(Number(savedRsvpId));
      setStatus("success");
    }
    if (savedAvatar) {
      setAvatar(savedAvatar);
    }
  }, [eventId]);

  useEffect(() => {
    if (myRsvpId && rsvps.length > 0) {
      const myRsvp = rsvps.find((r) => r.id === myRsvpId);
      if (myRsvp) {
        if (myRsvp.is_coming === null) setAttendance("maybe");
        else if (myRsvp.is_coming) setAttendance("going");
        else setAttendance("not_going");
        setPlusOneCount(myRsvp.plus_one_count ?? 0);
        setCompanionNames(myRsvp.companion_names ?? "");
      }
    }
  }, [myRsvpId, rsvps]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !guestPhone.trim()) return;
    setStatus("submitting");
    setLoginError("");

    const cleanPhone = guestPhone.replace(/-/g, "");
    const isComing = attendance === "going" ? true : attendance === "not_going" ? false : null;

    try {
      if (myRsvpId) {
        const updateData: Record<string, unknown> = {
          is_coming: isComing,
          avatar,
          plus_one_count: plusOneCount,
          companion_names: companionNames.trim() || null,
        };
        const { error } = await supabase
          .from("rsvps")
          .update(updateData)
          .eq("id", myRsvpId);
        if (error) throw error;
      } else {
        const { data: existing } = await supabase
          .from("rsvps")
          .select("id")
          .eq("event_id", eventId)
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existing) {
          setMyRsvpId(existing.id);
          localStorage.setItem(`invito_rsvp_id_${eventId}`, String(existing.id));
          const updateData: Record<string, unknown> = {
            is_coming: isComing,
            avatar,
            guest_name: guestName.trim(),
            plus_one_count: plusOneCount,
            companion_names: companionNames.trim() || null,
          };
          await supabase.from("rsvps").update(updateData).eq("id", existing.id);
        } else {
          const { data, error } = await supabase
            .from("rsvps")
            .insert({
              event_id: eventId,
              guest_name: guestName.trim(),
              phone: cleanPhone,
              is_coming: isComing,
              avatar,
              plus_one_count: plusOneCount,
              companion_names: companionNames.trim() || null,
            })
            .select("id")
            .single();
          if (error) throw error;
          if (data) {
            setMyRsvpId(data.id);
            localStorage.setItem(`invito_rsvp_id_${eventId}`, String(data.id));
          }
        }
      }

      localStorage.setItem(`invito_guest_name_${eventId}`, guestName.trim());
      localStorage.setItem(`invito_guest_phone_${eventId}`, cleanPhone);
      localStorage.setItem(`invito_avatar_${eventId}`, avatar);
      setStatus("success");
      fetchRsvps();
    } catch {
      setStatus("error");
    }
  }

  function handleEdit() {
    setStatus("idle");
  }

  if (loadingEvent) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-muted text-sm animate-pulse">불러오는 중...</div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center animate-fade-in">
          <p className="text-5xl mb-4 opacity-50">?</p>
          <p className="font-bold text-xl">이벤트를 찾을 수 없습니다</p>
          <p className="text-muted text-sm mt-2">링크를 다시 확인해주세요</p>
        </div>
      </main>
    );
  }

  const loc = parseLocation(event.location);
  const comingList = rsvps.filter((r) => r.is_coming === true);
  const maybeList = rsvps.filter((r) => r.is_coming === null);
  const notComingList = rsvps.filter((r) => r.is_coming === false);
  const isRevealed = rsvps.length >= REVEAL_THRESHOLD;
  const hasPaymentGuide = Boolean(event.payment_toss_url?.trim() || event.payment_details?.trim());

  const attendanceLabel =
    attendance === "going" ? "참석" : attendance === "maybe" ? "미정" : "불참";

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {event.background_image_url && (
        <>
          <div
            className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat scale-105"
            style={{ backgroundImage: `url(${event.background_image_url})` }}
            aria-hidden
          />
          <div className="fixed inset-0 -z-10 bg-background/20" aria-hidden />
        </>
      )}

      <div className="px-5 py-10 relative z-0">
        <div className="max-w-md mx-auto animate-fade-in">
        {/* Brand + 배경음 */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="text-sm font-black tracking-widest gradient-text">INVITO</span>
          <InviteBgmPlayer audioUrl={event.audio_url} />
        </div>

        {/* Event Image */}
        {event.image_url && (
          <div className="w-full min-h-[280px] max-h-[52vh] rounded-2xl overflow-hidden mb-6 ring-1 ring-card-border shadow-lg">
            <img src={event.image_url} alt="event" className="w-full h-full min-h-[280px] object-cover object-top" />
          </div>
        )}

        {/* Event Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-black leading-tight mb-4">{event.title}</h1>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-sm border border-card-border">📅</span>
              <span className="text-sm font-medium">{event.date}</span>
            </div>
            {loc.name && (
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-sm border border-card-border">📍</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{loc.name}</span>
                  {loc.url && (
                    <a
                      href={loc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-accent border border-accent/30 px-2 py-0.5 rounded-full hover:bg-accent/10 transition-all"
                    >
                      지도 보기 →
                    </a>
                  )}
                </div>
              </div>
            )}
            {event.host_name && (
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-sm border border-card-border">👤</span>
                <span className="text-sm font-medium">{event.host_name} 주최</span>
              </div>
            )}
            {event.description && (
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-card flex items-center justify-center text-sm border border-card-border shrink-0">💬</span>
                <span className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{event.description}</span>
              </div>
            )}
          </div>
        </div>

        {event.punctuality_note?.trim() && (
          <div className="glass rounded-2xl p-5 mb-6 border border-brand-blue/15">
            <p className="text-xs font-bold tracking-wider text-brand-blue uppercase mb-2">시간 안내</p>
            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{event.punctuality_note}</p>
          </div>
        )}

        {hasPaymentGuide && (
          <div className="glass rounded-2xl p-5 mb-6 border border-card-border">
            <p className="text-xs font-bold tracking-wider text-muted uppercase mb-3">참가비 · 입금</p>
            {event.payment_details?.trim() && (
              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed mb-4">{event.payment_details}</p>
            )}
            {event.payment_toss_url?.trim() && (
              <a
                href={event.payment_toss_url.trim()}
                className="block w-full text-center btn-primary font-bold text-base py-3.5 rounded-xl mb-3"
              >
                토스로 송금하기
              </a>
            )}
            <p className="text-[11px] text-muted leading-relaxed">
              토스 앱이 없으면 위 문구의 카카오페이 또는 계좌로 보내주시면 돼요.
            </p>
          </div>
        )}

        {/* RSVP Form */}
        <div className="glass rounded-2xl p-5 mb-6">
          {status === "success" ? (
            <div>
              <p className="text-xs font-bold tracking-wider text-muted uppercase mb-3">내 응답</p>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{avatar}</span>
                <span className="font-bold text-lg">{guestName}</span>
                <span className={`text-sm font-semibold ${
                  attendance === "going" ? "text-brand-blue" :
                  attendance === "maybe" ? "text-accent" : "text-muted"
                }`}>
                  {attendanceLabel}
                </span>
              </div>
              <p className="text-xs text-muted mb-4">응답이 저장됐습니다</p>
              {(plusOneCount > 0 || companionNames.trim()) && (
                <p className="text-xs text-foreground/90 mb-4 bg-card/80 border border-card-border rounded-xl px-3 py-2">
                  동반 <span className="font-bold">{plusOneCount}</span>명
                  {companionNames.trim() ? (
                    <>
                      {" "}
                      · {companionNames.trim()}
                    </>
                  ) : null}
                </p>
              )}
              {hasPaymentGuide && (
                <p className="text-xs text-muted leading-relaxed mb-4 bg-brand-blue/5 border border-brand-blue/15 rounded-xl px-3 py-2.5">
                  <span className="font-bold text-brand-blue">확정 안내</span>
                  <br />
                  RSVP와 참가비 입금까지 완료해 주시면 참석이 확정돼요. 별도 확인 문자는 보내지 않아요.
                </p>
              )}
              <button
                onClick={handleEdit}
                className="w-full border border-card-border text-muted font-bold text-sm py-3 rounded-xl hover:border-accent/50 hover:text-foreground active:scale-[0.98] transition-all"
              >
                응답 수정하기
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-xs font-bold tracking-wider text-muted uppercase mb-4">RSVP</p>

              <div className="mb-3">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                  placeholder="이름"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
              </div>
              <div className="mb-4">
                <input
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  required
                  type="tel"
                  inputMode="numeric"
                  placeholder="전화번호"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
                <p className="text-[10px] text-muted mt-1">- 없이 숫자만 입력</p>
              </div>

              {/* Companion */}
              <div className="mb-4">
                <p className="text-xs font-bold tracking-wider text-muted uppercase mb-2">함께 오는 분</p>
                <div className="flex gap-3 items-center mb-2">
                  <label className="text-xs text-muted shrink-0">추가 인원</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={plusOneCount}
                    onChange={(e) => setPlusOneCount(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
                    className="w-20 bg-input-bg border border-input-border rounded-xl px-3 py-2 text-sm font-semibold text-center"
                  />
                  <span className="text-xs text-muted">명 (본인 제외)</span>
                </div>
                <input
                  value={companionNames}
                  onChange={(e) => setCompanionNames(e.target.value)}
                  placeholder="이름만 간단히 (예: 민수, 지은)"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
                <p className="text-[10px] text-muted mt-1">혼자 오면 추가 인원 0으로 두시면 돼요</p>
              </div>

              {/* Avatar Picker */}
              <div className="mb-4">
                <p className="text-xs font-bold tracking-wider text-muted uppercase mb-2">내 캐릭터</p>
                <div className="flex flex-wrap gap-1.5">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${
                        avatar === a
                          ? "bg-accent/20 border-2 border-accent ring-2 ring-accent/20 scale-110"
                          : "bg-card border border-card-border hover:border-accent/30"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attendance Toggle — 3 options */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAttendance("going")}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${
                    attendance === "going"
                      ? "border-2 border-brand-blue text-brand-blue bg-brand-blue/5"
                      : "border border-card-border text-muted"
                  }`}
                >
                  갈게요 ✓
                </button>
                <button
                  type="button"
                  onClick={() => setAttendance("maybe")}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${
                    attendance === "maybe"
                      ? "border-2 border-accent text-accent bg-accent/5"
                      : "border border-card-border text-muted"
                  }`}
                >
                  미정 🤔
                </button>
                <button
                  type="button"
                  onClick={() => setAttendance("not_going")}
                  className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${
                    attendance === "not_going"
                      ? "border-2 border-muted text-foreground bg-muted/5"
                      : "border border-card-border text-muted"
                  }`}
                >
                  못 갈듯
                </button>
              </div>

              {status === "error" && (
                <div className="bg-error/10 border border-error/30 text-error text-sm px-4 py-3 rounded-xl mb-3">
                  오류가 발생했습니다. 다시 시도해주세요.
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full btn-rsvp font-bold text-base py-4 rounded-xl"
              >
                {status === "submitting" ? "저장 중..." : myRsvpId ? "응답 업데이트" : "RSVP 완료"}
              </button>
            </form>
          )}
        </div>

        {/* Comments */}
        <div className="mb-6">
          <Comments eventId={eventId} guestName={guestName} rsvps={rsvps} />
        </div>

        {/* Social Proof — blur until threshold */}
        {rsvps.length > 0 && (
          <div className="relative">
            {!isRevealed && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                <div className="glass rounded-2xl px-6 py-4 text-center">
                  <p className="text-2xl mb-2">👀</p>
                  <p className="text-sm font-bold">파티 시작 5시간 전에 공개됩니다</p>
                </div>
              </div>
            )}

            <div className={`transition-all duration-500 ${!isRevealed ? "blur-lg opacity-50 select-none" : ""}`}>
              {comingList.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold tracking-wider text-muted uppercase mb-3">
                    참석
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {comingList.map((r) => (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold transition-all ${
                          r.id === myRsvpId
                            ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                            : "bg-card text-foreground border border-card-border"
                        }`}
                      >
                        {r.avatar && <span>{r.avatar}</span>}
                        {r.guest_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {maybeList.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold tracking-wider text-muted uppercase mb-3">
                    미정
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {maybeList.map((r) => (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium ${
                          r.id === myRsvpId
                            ? "border-2 border-accent bg-accent-secondary/30 text-accent"
                            : "bg-accent-secondary/20 text-foreground/70 border border-accent-secondary/40"
                        }`}
                      >
                        {r.avatar && <span>{r.avatar}</span>}
                        {r.guest_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {notComingList.length > 0 && (
                <div>
                  <p className="text-xs font-bold tracking-wider text-muted uppercase mb-3">
                    불참
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notComingList.map((r) => (
                      <span
                        key={r.id}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium ${
                          r.id === myRsvpId
                            ? "border border-accent/50 text-accent"
                            : "bg-card/50 text-muted border border-card-border/50"
                        }`}
                      >
                        {r.avatar && <span>{r.avatar}</span>}
                        {r.guest_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
