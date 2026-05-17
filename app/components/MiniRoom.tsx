"use client";

import { useMemo, useState, useEffect } from "react";
import type { Rsvp } from "@/lib/supabase";

type Props = {
  rsvps: Rsvp[];
  hostName: string | null;
  myRsvpId: number | null;
};

function basePosition(index: number, total: number) {
  const cols = Math.max(3, Math.ceil(Math.sqrt(total + 1)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const cellW = 55 / cols;
  const rows = Math.ceil(total / cols);
  const cellH = 35 / Math.max(rows, 1);
  const jX = ((index * 23 + 5) % 11) - 5;
  const jY = ((index * 17 + 3) % 9) - 4;
  return {
    x: 22 + col * cellW + cellW / 2 + jX,
    y: 30 + row * cellH + cellH / 2 + jY,
  };
}

const DANCE_STYLES = ["dance-bounce", "dance-twist", "dance-wave", "dance-jump", "dance-sway"];

function DancingCharacter({
  emoji,
  name,
  photoUrl,
  isMe,
  isHost,
  danceStyle,
  wanderX,
  wanderY,
}: {
  emoji: string;
  name: string;
  photoUrl?: string | null;
  isMe?: boolean;
  isHost?: boolean;
  danceStyle: string;
  wanderX: number;
  wanderY: number;
}) {
  const bodyColor = isHost ? "#FF6B35" : isMe ? "#004E89" : "#7BAFD4";
  const darkBody = isHost ? "#cc5529" : isMe ? "#003560" : "#5e8fad";
  const lightBody = isHost ? "#ff8c5a" : isMe ? "#1a6db5" : "#a0cce8";

  return (
    <div
      className="flex flex-col items-center"
      style={{
        transform: `translateX(${wanderX}px) translateY(${wanderY}px)`,
        transition: "transform 3s ease-in-out",
      }}
    >
      <div className={danceStyle}>
        <div className="flex flex-col items-center">
          {/* Head */}
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className={`rounded-full object-cover border-2 ${
                isMe ? "border-brand-blue shadow-lg" :
                isHost ? "border-accent shadow-lg" : "border-white shadow"
              }`}
              style={{ width: 36, height: 36, zIndex: 3, position: "relative" }}
            />
          ) : (
            <div
              className="flex items-center justify-center"
              style={{
                width: 36, height: 36, fontSize: 30, lineHeight: 1,
                zIndex: 3, position: "relative",
                filter: isMe
                  ? "drop-shadow(0 0 5px rgba(0,78,137,0.4))"
                  : isHost
                  ? "drop-shadow(0 0 5px rgba(255,107,53,0.4))"
                  : "drop-shadow(0 1px 2px rgba(0,0,0,0.12))",
              }}
            >
              {emoji}
            </div>
          )}

          {/* Body with dancing arms */}
          <svg width="26" height="30" viewBox="0 0 26 30" style={{ marginTop: -5, zIndex: 2 }}>
            {/* Torso */}
            <rect x="5" y="0" width="16" height="14" rx="2" fill={bodyColor} />
            <rect x="16" y="0" width="5" height="14" rx="1" fill={darkBody} />
            <rect x="5" y="0" width="16" height="3" rx="1" fill={lightBody} opacity="0.4" />
            {/* Left arm — animated */}
            <rect x="0" y="1" width="5" height="10" rx="2.5" fill={bodyColor} className="arm-left" />
            {/* Right arm — animated */}
            <rect x="21" y="1" width="5" height="10" rx="2.5" fill={darkBody} className="arm-right" />
            {/* Left leg */}
            <rect x="6" y="13" width="5" height="11" rx="2.5" fill={darkBody} className="leg-left" />
            {/* Right leg */}
            <rect x="15" y="13" width="5" height="11" rx="2.5" fill={bodyColor} className="leg-right" />
            {/* Shoes */}
            <ellipse cx="8.5" cy="25" rx="4" ry="2.5" fill="#2a2a2a" />
            <ellipse cx="17.5" cy="25" rx="4" ry="2.5" fill="#333" />
          </svg>

          {/* Shadow */}
          <div style={{
            width: 24, height: 6, borderRadius: "50%",
            background: "rgba(0,0,0,0.08)", marginTop: -2,
          }} />
        </div>
      </div>

      {/* Name */}
      <span
        className={`text-[8px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[60px] truncate ${
          isHost ? "bg-accent text-white" :
          isMe ? "bg-brand-blue text-white" :
          "bg-white/90 text-foreground border border-card-border"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function useWander(count: number) {
  const [offsets, setOffsets] = useState<{ x: number; y: number }[]>(
    () => Array.from({ length: count + 1 }, () => ({ x: 0, y: 0 }))
  );

  useEffect(() => {
    function randomize() {
      setOffsets(
        Array.from({ length: count + 1 }, () => ({
          x: Math.round((Math.random() - 0.5) * 24),
          y: Math.round((Math.random() - 0.5) * 12),
        }))
      );
    }
    randomize();
    const interval = setInterval(randomize, 3500);
    return () => clearInterval(interval);
  }, [count]);

  return offsets;
}

export default function MiniRoom({ rsvps, hostName, myRsvpId }: Props) {
  const goingRsvps = useMemo(() => rsvps.filter((r) => r.is_coming === true), [rsvps]);
  const offsets = useWander(goingRsvps.length);
  const totalPeople = goingRsvps.length + (hostName ? 1 : 0);

  if (totalPeople === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden mb-6 border border-card-border">
      {/* Isometric scene */}
      <div className="relative" style={{ height: 380, overflow: "hidden" }}>

        {/* Sky gradient */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, #87CEEB 0%, #B5E3F5 30%, #E8F4FD 60%, transparent 60%)",
        }} />

        {/* Sun */}
        <div className="absolute" style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "radial-gradient(circle, #FFE082 30%, #FFD54F 60%, transparent 100%)",
          boxShadow: "0 0 40px rgba(255,213,79,0.5), 0 0 80px rgba(255,213,79,0.2)",
          top: 20, right: 40,
        }} />

        {/* Clouds */}
        <div className="absolute" style={{ top: 25, left: "15%", fontSize: 22, opacity: 0.6, animation: "cloud-drift 20s linear infinite" }}>☁️</div>
        <div className="absolute" style={{ top: 40, left: "60%", fontSize: 18, opacity: 0.4, animation: "cloud-drift 25s linear infinite", animationDelay: "-8s" }}>☁️</div>

        {/* Isometric floor */}
        <div
          className="absolute"
          style={{
            width: "140%", height: "140%",
            left: "-20%", top: "5%",
            transformOrigin: "50% 50%",
            transform: "perspective(600px) rotateX(55deg) rotateZ(45deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Floor tiles */}
          <div className="absolute inset-0" style={{
            background: "repeating-conic-gradient(#E8DFC0 0% 25%, #DDD4B5 0% 50%) 0 0 / 50px 50px",
            borderRadius: 12,
            boxShadow: "inset 0 0 80px rgba(0,0,0,0.04)",
          }} />

          {/* Rug */}
          <div className="absolute" style={{
            width: "28%", height: "28%",
            left: "36%", top: "36%",
            background: "linear-gradient(135deg, #F7C59F 0%, #FFD5B5 100%)",
            borderRadius: 8, border: "3px solid #e8b48a", opacity: 0.45,
          }} />

          {/* Walls */}
          <div className="absolute" style={{
            width: "100%", height: 50, bottom: 0, left: 0,
            background: "linear-gradient(0deg, #FFE8CC, #FFF3E0)",
            transformOrigin: "bottom", transform: "rotateX(-90deg)",
            borderTop: "2px solid #D4B896",
          }}>
            {/* Window on back wall */}
            <div className="absolute" style={{ left: "40%", top: 4, width: 20, height: 30, background: "#B5E3F5", border: "2px solid #C8B896", borderRadius: 2 }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div style={{ width: 1, height: "100%", background: "#C8B896" }} />
              </div>
            </div>
          </div>
          <div className="absolute" style={{
            width: 50, height: "100%", right: 0, top: 0,
            background: "linear-gradient(270deg, #FFE0BF, #FFF0DB)",
            transformOrigin: "right", transform: "rotateY(90deg)",
            borderLeft: "2px solid #D4B896",
          }}>
            {/* Shelf on side wall */}
            <div className="absolute" style={{ bottom: 15, left: 8, width: 30, height: 3, background: "#C8A87A", borderRadius: 1 }} />
          </div>
        </div>

        {/* Furniture layer — SVG illustrations */}
        <div className="absolute inset-0" style={{ zIndex: 5 }}>
          {/* Sofa bottom-left */}
          <svg className="absolute" style={{ left: "2%", bottom: "6%", width: 80, height: 50, opacity: 0.75 }} viewBox="0 0 80 50">
            <rect x="5" y="15" width="70" height="25" rx="8" fill="#C4956A" />
            <rect x="0" y="10" width="18" height="30" rx="6" fill="#B08050" />
            <rect x="62" y="10" width="18" height="30" rx="6" fill="#B08050" />
            <rect x="10" y="8" width="60" height="12" rx="5" fill="#D4A574" />
            <rect x="5" y="38" width="8" height="8" rx="2" fill="#8B6847" />
            <rect x="67" y="38" width="8" height="8" rx="2" fill="#8B6847" />
          </svg>

          {/* Big plant right */}
          <svg className="absolute" style={{ right: "5%", top: "32%", width: 50, height: 70, opacity: 0.7 }} viewBox="0 0 50 70">
            <rect x="17" y="45" width="16" height="22" rx="3" fill="#C4956A" />
            <rect x="15" y="43" width="20" height="5" rx="2" fill="#B08050" />
            <ellipse cx="25" cy="30" rx="18" ry="20" fill="#5B8C3E" />
            <ellipse cx="20" cy="25" rx="12" ry="15" fill="#6DA34D" />
            <ellipse cx="30" cy="28" rx="10" ry="13" fill="#4A7A2E" />
            <line x1="25" y1="30" x2="25" y2="45" stroke="#5B8C3E" strokeWidth="3" />
          </svg>

          {/* Small plant left */}
          <svg className="absolute" style={{ left: "3%", top: "40%", width: 35, height: 50, opacity: 0.6 }} viewBox="0 0 35 50">
            <rect x="10" y="30" width="15" height="18" rx="3" fill="#D4A574" />
            <ellipse cx="17" cy="22" rx="13" ry="14" fill="#6DA34D" />
            <ellipse cx="14" cy="18" rx="8" ry="10" fill="#7DBB5E" />
          </svg>

          {/* Coffee table center */}
          <svg className="absolute" style={{ left: "38%", bottom: "4%", width: 70, height: 35, opacity: 0.55 }} viewBox="0 0 70 35">
            <rect x="5" y="0" width="60" height="8" rx="3" fill="#A0784C" />
            <rect x="5" y="0" width="60" height="3" rx="2" fill="#B88F5E" opacity="0.6" />
            <rect x="12" y="8" width="5" height="22" rx="1" fill="#8B6847" />
            <rect x="53" y="8" width="5" height="22" rx="1" fill="#8B6847" />
            <circle cx="25" cy="4" r="3" fill="#E8DFC0" opacity="0.8" />
            <circle cx="45" cy="4" r="3.5" fill="#FFD5B5" opacity="0.7" />
          </svg>

          {/* Balloon cluster — SVG */}
          <svg className="absolute" style={{ right: "12%", top: "20%", width: 40, height: 60, opacity: 0.5 }} viewBox="0 0 40 60">
            <line x1="15" y1="35" x2="20" y2="58" stroke="#aaa" strokeWidth="0.5" />
            <line x1="25" y1="30" x2="20" y2="58" stroke="#aaa" strokeWidth="0.5" />
            <line x1="20" y1="32" x2="20" y2="58" stroke="#aaa" strokeWidth="0.5" />
            <ellipse cx="15" cy="25" rx="10" ry="13" fill="#FF6B6B" opacity="0.7" />
            <ellipse cx="25" cy="20" rx="9" ry="12" fill="#4ECDC4" opacity="0.7" />
            <ellipse cx="20" cy="22" rx="9" ry="12" fill="#FFE66D" opacity="0.7" />
          </svg>

          {/* Balloon left */}
          <svg className="absolute" style={{ left: "10%", top: "24%", width: 24, height: 40, opacity: 0.4 }} viewBox="0 0 24 40">
            <line x1="12" y1="22" x2="12" y2="38" stroke="#aaa" strokeWidth="0.5" />
            <ellipse cx="12" cy="14" rx="9" ry="12" fill="#FF6B35" opacity="0.6" />
          </svg>

          {/* Speaker bottom-right */}
          <svg className="absolute" style={{ right: "3%", bottom: "12%", width: 30, height: 40, opacity: 0.5 }} viewBox="0 0 30 40">
            <rect x="2" y="2" width="26" height="36" rx="4" fill="#333" />
            <circle cx="15" cy="15" r="8" fill="#444" stroke="#555" strokeWidth="1" />
            <circle cx="15" cy="15" r="3" fill="#555" />
            <circle cx="15" cy="32" r="4" fill="#444" stroke="#555" strokeWidth="1" />
          </svg>

          {/* Disco ball — SVG */}
          <svg className="absolute" style={{ left: "50%", top: "14%", width: 20, height: 28, opacity: 0.45, transform: "translateX(-50%)", animation: "disco-spin 6s linear infinite" }} viewBox="0 0 20 28">
            <line x1="10" y1="0" x2="10" y2="8" stroke="#888" strokeWidth="0.5" />
            <circle cx="10" cy="16" r="8" fill="#ccc" />
            <circle cx="8" cy="14" r="1.5" fill="#fff" opacity="0.5" />
            <circle cx="12" cy="13" r="1" fill="#fff" opacity="0.4" />
            <circle cx="10" cy="18" r="1.2" fill="#fff" opacity="0.3" />
            <circle cx="14" cy="17" r="1" fill="#fff" opacity="0.4" />
            <circle cx="7" cy="18" r="0.8" fill="#fff" opacity="0.3" />
          </svg>
        </div>

        {/* Sun rays overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(135deg, rgba(255,213,79,0.08) 0%, transparent 40%)",
        }} />

        {/* Characters */}
        <div className="absolute inset-0" style={{ zIndex: 10 }}>
          {hostName && (
            <div className="absolute" style={{
              left: "50%", top: "50%",
              transform: "translate(-50%, -100%)", zIndex: 50,
            }}>
              <DancingCharacter
                emoji="👑"
                name={hostName}
                isHost
                danceStyle={DANCE_STYLES[0]}
                wanderX={offsets[0]?.x || 0}
                wanderY={offsets[0]?.y || 0}
              />
            </div>
          )}

          {goingRsvps.map((rsvp, i) => {
            const pos = basePosition(i, goingRsvps.length);
            const isMe = rsvp.id === myRsvpId;
            const screenY = pos.y + 28;
            const o = offsets[i + 1] || { x: 0, y: 0 };

            return (
              <div
                key={rsvp.id}
                className="absolute"
                style={{
                  left: `${pos.x}%`,
                  top: `${screenY}%`,
                  transform: "translate(-50%, -100%)",
                  zIndex: Math.round(screenY + (o.y || 0)),
                }}
              >
                <DancingCharacter
                  emoji={rsvp.avatar || "😊"}
                  name={rsvp.guest_name}
                  photoUrl={rsvp.photo_url}
                  isMe={isMe}
                  danceStyle={DANCE_STYLES[(i + 1) % DANCE_STYLES.length]}
                  wanderX={o.x}
                  wanderY={o.y}
                />
              </div>
            );
          })}
        </div>

        {/* People count */}
        <div className="absolute bottom-3 right-3 z-20">
          <span className="text-[10px] font-bold bg-white/80 text-foreground px-2.5 py-1 rounded-full border border-card-border">
            {totalPeople}명 참석
          </span>
        </div>
      </div>
    </div>
  );
}
