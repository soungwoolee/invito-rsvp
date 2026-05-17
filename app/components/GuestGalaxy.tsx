"use client";

import { useMemo } from "react";
import type { Rsvp } from "@/lib/supabase";

type Props = {
  rsvps: Rsvp[];
  hostName: string | null;
  myRsvpId: number | null;
};

const ORBIT_RADII = [80, 115, 150, 185, 220];
const DURATIONS = [24, 32, 40, 36, 48];
const COLORS = [
  "#a855f7", "#ec4899", "#f97316", "#34d399",
  "#3b82f6", "#eab308", "#ef4444", "#06b6d4",
  "#8b5cf6", "#f43f5e", "#10b981", "#f59e0b",
];

function getAngle(idx: number, total: number) {
  return (360 / Math.max(total, 1)) * idx;
}

function getInitial(name: string) {
  return name.charAt(0).toUpperCase();
}

export default function GuestGalaxy({ rsvps, hostName, myRsvpId }: Props) {
  const comingRsvps = useMemo(() => rsvps.filter((r) => r.is_coming), [rsvps]);
  const total = comingRsvps.length;

  if (total === 0) return null;

  const containerHeight = Math.min(420, 280 + total * 8);
  const maxRadius = Math.min(ORBIT_RADII[ORBIT_RADII.length - 1], 100 + total * 12);

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6">
      <div className="px-5 pt-4 pb-2">
        <p className="text-xs font-bold tracking-wider text-muted uppercase">
          참석자 은하계
        </p>
      </div>

      <div className="relative w-full" style={{ height: containerHeight }}>
        {/* Stars */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <circle
              key={i}
              cx={`${(i * 173 % 97) + 1.5}%`}
              cy={`${(i * 137 % 93) + 1.5}%`}
              r={i % 5 === 0 ? 1.2 : 0.6}
              fill="white"
              opacity={0.1 + (i % 4) * 0.06}
            />
          ))}
        </svg>

        {/* Orbit tracks */}
        {Array.from(new Set(comingRsvps.map((_, i) => {
          const radiusScale = maxRadius / ORBIT_RADII[ORBIT_RADII.length - 1];
          return ORBIT_RADII[i % ORBIT_RADII.length] * radiusScale;
        }))).map((r) => (
          <div
            key={r}
            className="absolute rounded-full border border-white/[0.04]"
            style={{
              width: r * 2,
              height: r * 2,
              top: "50%",
              left: "50%",
              marginLeft: -r,
              marginTop: -r,
            }}
          />
        ))}

        {/* Center — Host */}
        <div
          className="absolute z-10"
          style={{
            top: "50%",
            left: "50%",
            width: 52,
            height: 52,
            marginLeft: -26,
            marginTop: -26,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            fontWeight: 800,
            color: "white",
            boxShadow: "0 0 30px rgba(168, 85, 247, 0.4)",
            animation: "glow-pulse 3s ease-in-out infinite",
          }}
        >
          {hostName ? getInitial(hostName) : "H"}
        </div>

        {/* Guest planets */}
        {comingRsvps.map((rsvp, i) => {
          const radiusScale = maxRadius / ORBIT_RADII[ORBIT_RADII.length - 1];
          const orbitR = ORBIT_RADII[i % ORBIT_RADII.length] * radiusScale;
          const dur = DURATIONS[i % DURATIONS.length] + (i % 3) * 4;
          const startAngle = getAngle(i, total);
          const color = COLORS[i % COLORS.length];
          const isMe = rsvp.id === myRsvpId;
          const size = isMe ? 42 : 36;

          return (
            <div
              key={rsvp.id}
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                animation: `orbit ${dur}s linear infinite`,
                animationDelay: `${-(dur * startAngle) / 360}s`,
                ["--orbit-r" as string]: `${orbitR}px`,
              }}
            >
              <div
                className="relative group"
                style={{
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  animation: `counter-orbit ${dur}s linear infinite`,
                  animationDelay: `${-(dur * startAngle) / 360}s`,
                }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold transition-transform hover:scale-110"
                  style={{
                    background: isMe
                      ? `linear-gradient(135deg, ${color}, ${COLORS[(i + 3) % COLORS.length]})`
                      : color + "33",
                    border: `2px solid ${color}`,
                    color: isMe ? "white" : color,
                    boxShadow: isMe ? `0 0 16px ${color}66` : "none",
                  }}
                >
                  {getInitial(rsvp.guest_name)}
                </div>
                {/* Tooltip */}
                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[10px] font-medium text-foreground bg-card px-2 py-0.5 rounded-full border border-card-border whitespace-nowrap">
                    {rsvp.guest_name}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
