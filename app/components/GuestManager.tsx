"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase, formatPhone } from "@/lib/supabase";

type Guest = {
  id: number;
  event_id: string;
  name: string;
  phone: string;
  invited_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

type Props = {
  eventId: string;
};

export default function GuestManager({ eventId }: Props) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [message, setMessage] = useState("");

  const fetchGuests = useCallback(async () => {
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (data) setGuests(data);
  }, [eventId]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) return;
    setAdding(true);
    const cleanPhone = phone.replace(/-/g, "");
    await supabase.from("guests").insert({
      event_id: eventId,
      name: name.trim(),
      phone: cleanPhone,
    });
    setName("");
    setPhone("");
    setShowAdd(false);
    setAdding(false);
    fetchGuests();
  }

  async function handleDelete(id: number) {
    await supabase.from("guests").delete().eq("id", id);
    fetchGuests();
  }

  async function handleSendReminders() {
    setSendingAll(true);
    setMessage("");

    const guestLink = `${window.location.origin}/event/${eventId}`;
    const unsent = guests.filter((g) => !g.reminder_sent_at);

    if (unsent.length === 0) {
      setMessage("모든 게스트에게 이미 발송했습니다.");
      setSendingAll(false);
      return;
    }

    // Mark as sent (actual SMS integration later)
    const ids = unsent.map((g) => g.id);
    await supabase
      .from("guests")
      .update({ reminder_sent_at: new Date().toISOString() })
      .in("id", ids);

    setMessage(
      `${unsent.length}명에게 리마인더 발송 준비 완료! (SMS API 연동 후 실제 발송됩니다)\n링크: ${guestLink}`
    );
    setSendingAll(false);
    fetchGuests();
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold tracking-wider text-muted uppercase">게스트 관리</p>
          <p className="text-[10px] text-muted-light mt-0.5">{guests.length}명 등록</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-accent font-bold hover:text-accent-secondary transition-colors"
        >
          {showAdd ? "취소" : "+ 추가"}
        </button>
      </div>

      {showAdd && (
        <div className="flex flex-col gap-2 mb-4 p-3 bg-input-bg rounded-xl border border-input-border">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            className="w-full bg-transparent border border-input-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-light focus:outline-none focus:border-accent transition-all"
          />
          <input
            value={phone}
            onChange={(e) => {
              const formatted = formatPhone(e.target.value);
              if (formatted.replace(/-/g, "").length <= 11) setPhone(formatted);
            }}
            placeholder="전화번호"
            type="tel"
            inputMode="numeric"
            className="w-full bg-transparent border border-input-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-light focus:outline-none focus:border-accent transition-all"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !name.trim() || !phone.trim()}
            className="btn-primary py-2 rounded-lg text-sm font-bold"
          >
            {adding ? "추가 중..." : "게스트 추가"}
          </button>
        </div>
      )}

      {guests.length > 0 && (
        <>
          <div className="flex flex-col gap-2 mb-4">
            {guests.map((g) => (
              <div key={g.id} className="flex items-center justify-between bg-card rounded-xl px-3 py-2.5 border border-card-border">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                    {g.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-xs text-muted ml-2">{formatPhone(g.phone)}</span>
                  </div>
                  {g.reminder_sent_at && (
                    <span className="text-[10px] text-success font-bold ml-1">발송됨</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="text-muted-light hover:text-error text-xs transition-colors"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleSendReminders}
            disabled={sendingAll}
            className="w-full border border-accent/40 text-accent font-bold text-sm py-3 rounded-xl hover:bg-accent/10 active:scale-[0.98] transition-all"
          >
            {sendingAll ? "발송 중..." : "리마인더 보내기 (미발송자)"}
          </button>

          {message && (
            <p className="text-xs text-success mt-3 whitespace-pre-line">{message}</p>
          )}
        </>
      )}

      {guests.length === 0 && !showAdd && (
        <p className="text-muted-light text-sm text-center py-3">
          게스트를 추가하면 리마인더를 보낼 수 있어요
        </p>
      )}
    </div>
  );
}
