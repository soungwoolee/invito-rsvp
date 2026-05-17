"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase, formatPhone } from "@/lib/supabase";

function formatDateKorean(dateStr: string, timeStr: string): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T${timeStr || "00:00"}`);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];

  if (!timeStr) {
    return `${date.getFullYear()}년 ${month}월 ${day}일 (${dayOfWeek})`;
  }
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours < 12 ? "오전" : "오후";
  const displayHour = hours % 12 || 12;
  const displayMin = minutes > 0 ? ` ${minutes}분` : "";
  return `${date.getFullYear()}년 ${month}월 ${day}일 (${dayOfWeek}) ${ampm} ${displayHour}시${displayMin}`;
}

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bgImageFile, setBgImageFile] = useState<File | null>(null);
  const [bgImagePreview, setBgImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    location_url: "",
    time_note: "",
    description: "",
    host_name: "",
    host_phone: "",
    host_key: "",
    payment_toss_url: "",
    payment_details: "",
    punctuality_note: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/-/g, "").length <= 11) {
      setForm((prev) => ({ ...prev, host_phone: formatted }));
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지는 5MB 이하만 업로드 가능합니다.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function handleBgImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("배경 이미지는 5MB 이하만 업로드 가능합니다.");
      return;
    }
    setBgImageFile(file);
    setBgImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function handleAudioChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".mp3")) {
      setError("음악은 .mp3 파일만 올려 주세요.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("음악 파일은 12MB 이하만 가능합니다.");
      return;
    }
    setAudioFile(file);
    setError("");
  }

  /** public/sample-party/ 에 넣은 데모용 커버·배경 (행사마다 직접 올려도 됨) */
  function applySampleMedia() {
    setImageFile(null);
    setImagePreview("/sample-party/main.png");
    setBgImageFile(null);
    setBgImagePreview("/sample-party/dive.png");
    setError("");
  }

  async function uploadImage(eventId: string): Promise<string | null> {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop();
    const path = `${eventId}/cover_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("event-images")
      .upload(path, imageFile, { upsert: true });
    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      setError(`이미지 업로드 실패: ${uploadErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadBackgroundImage(eventId: string): Promise<string | null> {
    if (!bgImageFile) return null;
    const ext = bgImageFile.name.split(".").pop();
    const path = `${eventId}/bg_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("event-images")
      .upload(path, bgImageFile, { upsert: true });
    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      setError(`배경 이미지 업로드 실패: ${uploadErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadAudio(eventId: string): Promise<string | null> {
    if (!audioFile) return null;
    const path = `${eventId}/bgm_${Date.now()}.mp3`;
    const { error: uploadErr } = await supabase.storage
      .from("event-images")
      .upload(path, audioFile, {
        upsert: true,
        contentType: "audio/mpeg",
      });
    if (uploadErr) {
      console.error("Audio upload error:", uploadErr);
      setError(`음악 업로드 실패: ${uploadErr.message}`);
      return null;
    }
    const { data } = supabase.storage.from("event-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.host_key.length < 8) {
      setError("Key는 최소 8자 이상이어야 합니다.");
      return;
    }

    setLoading(true);

    const dateDisplay = formatDateKorean(form.date, form.time);
    const locationFull = form.location_url
      ? `${form.location}||${form.location_url}`
      : form.location || null;

    const baseRow = {
      title: form.title,
      date: dateDisplay,
      location: locationFull,
      description: form.description || null,
      host_name: form.host_name || null,
      host_phone: form.host_phone.replace(/-/g, ""),
      host_key: form.host_key,
    };
    const extendedRow = {
      ...baseRow,
      payment_toss_url: form.payment_toss_url.trim() || null,
      payment_details: form.payment_details.trim() || null,
      punctuality_note: form.punctuality_note.trim() || null,
    };

    let { data, error: dbError } = await supabase
      .from("events")
      .insert(extendedRow)
      .select("id")
      .single();

    if (dbError) {
      const retry = await supabase.from("events").insert(baseRow).select("id").single();
      if (retry.error) {
        setError(
          `이벤트 생성 실패: ${retry.error.message}\n(Supabase의 events 테이블·RLS 정책을 확인해 주세요.)`
        );
        setLoading(false);
        return;
      }
      data = retry.data;
      dbError = null;
    }

    if (!data) {
      setError("이벤트 생성 중 오류가 발생했습니다. 다시 시도해주세요.");
      setLoading(false);
      return;
    }

    const eventPatch: Record<string, unknown> = {};

    if (imageFile) {
      const imageUrl = await uploadImage(data.id);
      if (imageUrl) eventPatch.image_url = imageUrl;
    } else if (imagePreview?.startsWith("/sample-party/")) {
      eventPatch.image_url = imagePreview;
    }

    if (bgImageFile) {
      const bgUrl = await uploadBackgroundImage(data.id);
      if (bgUrl) eventPatch.background_image_url = bgUrl;
    } else if (bgImagePreview?.startsWith("/sample-party/")) {
      eventPatch.background_image_url = bgImagePreview;
    }

    if (audioFile) {
      const audioUrl = await uploadAudio(data.id);
      if (audioUrl) eventPatch.audio_url = audioUrl;
    }

    if (Object.keys(eventPatch).length > 0) {
      await supabase.from("events").update(eventPatch).eq("id", data.id);
    }

    localStorage.setItem(`invito_phone_${data.id}`, form.host_phone.replace(/-/g, ""));
    localStorage.setItem(`invito_key_${data.id}`, form.host_key);

    router.push(`/manage/${data.id}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-6">
            <span className="text-2xl font-black tracking-widest gradient-text">INVITO</span>
            <span className="bg-accent/20 text-accent text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider border border-accent/30">HOST</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">
            새 이벤트<br />만들기
          </h1>
          <p className="text-muted text-sm mt-2">게스트에게 보낼 초대 링크를 생성합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* 이벤트 이미지 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              이벤트 이미지
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-full h-44 border border-dashed border-card-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition-all flex items-center justify-center bg-card"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <p className="text-3xl mb-2 opacity-50">+</p>
                  <p className="text-xs text-muted">탭해서 이미지 추가</p>
                  <p className="text-[10px] text-muted-light mt-1">JPG, PNG · 5MB 이하</p>
                </div>
              )}
              {imagePreview && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">변경</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={applySampleMedia}
              className="mt-2 text-xs font-semibold text-brand-blue hover:underline underline-offset-2"
            >
              샘플 커버·배경 적용
            </button>
          </div>

          {/* 배경 이미지 (옅게 깔리는 레이어) */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              배경 이미지 <span className="text-muted-light font-normal">(선택)</span>
            </label>
            <div
              onClick={() => bgFileInputRef.current?.click()}
              className="relative w-full h-32 border border-dashed border-card-border rounded-2xl overflow-hidden cursor-pointer hover:border-accent/50 transition-all flex items-center justify-center bg-card/80"
            >
              {bgImagePreview ? (
                <img src={bgImagePreview} alt="bg preview" className="w-full h-full object-cover opacity-90" />
              ) : (
                <div className="text-center px-4">
                  <p className="text-2xl mb-1 opacity-40">◇</p>
                  <p className="text-xs text-muted">탭해서 배경용 사진 추가</p>
                </div>
              )}
            </div>
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBgImageChange}
              className="hidden"
            />
          </div>

          {/* 배경음 (선택) */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              파티 음악 <span className="text-muted-light font-normal">(선택 · MP3)</span>
            </label>
            <div
              onClick={() => audioInputRef.current?.click()}
              className="w-full border border-dashed border-card-border rounded-xl px-4 py-3 cursor-pointer hover:border-accent/50 bg-card/80 text-sm text-muted"
            >
              {audioFile ? (
                <span className="font-medium text-foreground">{audioFile.name}</span>
              ) : (
                "탭해서 MP3 선택"
              )}
            </div>
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={handleAudioChange}
              className="hidden"
            />
            <p className="text-[10px] text-muted-light mt-1">12MB 이하 · 게스트 페이지에서 재생</p>
          </div>

          {/* 이벤트 이름 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              이벤트 이름 *
            </label>
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              placeholder="ex. 지현이 생일 파티"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* 날짜 + 시간 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              날짜 *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                name="date"
                type="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <input
                name="time"
                type="time"
                value={form.time}
                onChange={handleChange}
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
            </div>
            {form.date && (
              <p className="text-xs text-accent/70 mt-1.5">
                {formatDateKorean(form.date, form.time)}
              </p>
            )}
          </div>

          {/* 시간 메모 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              시간 메모 <span className="text-muted-light font-normal">(선택)</span>
            </label>
            <input
              name="time_note"
              value={form.time_note}
              onChange={handleChange}
              placeholder="ex. 선발대 5시, 본대 6시"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* 장소 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              장소
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="ex. 한남 어딘가"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
            <input
              name="location_url"
              value={form.location_url}
              onChange={handleChange}
              placeholder="지도 링크 (네이버지도/카카오맵 URL 붙여넣기)"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-sm font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all mt-2"
            />
          </div>

          {/* 설명/테마 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              한줄 소개 <span className="text-muted-light font-normal">(선택)</span>
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="ex. 드레스코드: 화이트 / 컨셉: 여름밤 루프탑"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* 참가비 / 송금 */}
          <div className="border border-card-border rounded-2xl p-4 space-y-4 bg-card/40">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">참가비 · 송금 안내</p>
            <div>
              <label className="block text-xs font-bold text-muted mb-2">토스 송금 링크</label>
              <input
                name="payment_toss_url"
                value={form.payment_toss_url}
                onChange={handleChange}
                placeholder="supertoss://send?bank=…"
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <p className="text-[10px] text-muted-light mt-1">비워두면 버튼은 숨겨지고 아래 문구만 보여요</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2">참가비·계좌 안내 문구</label>
              <textarea
                name="payment_details"
                value={form.payment_details}
                onChange={handleChange}
                rows={5}
                placeholder={`예)\n참가비 30,000원\n• 술과 핑거푸드 제공\n• 선물은 사절\n\n카카오페이 또는 아래 계좌`}
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-y min-h-[120px]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted mb-2">시간 맞춰 오기 안내</label>
              <textarea
                name="punctuality_note"
                value={form.punctuality_note}
                onChange={handleChange}
                rows={3}
                placeholder="예: 프로그램이 정해진 흐름대로 진행돼요. 시작 시간에 맞춰 와주시면 고마워요."
                className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3 text-sm font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all resize-y"
              />
            </div>
          </div>

          {/* 개최자 */}
          <div>
            <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
              개최자 이름
            </label>
            <input
              name="host_name"
              value={form.host_name}
              onChange={handleChange}
              placeholder="ex. 준혁"
              className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* 인증 정보 */}
          <div className="border-t border-card-border pt-5 mt-1">
            <p className="text-xs text-muted mb-4">아래 정보로 다른 기기에서도 관리할 수 있습니다</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold tracking-wider text-muted uppercase mb-2">
                  전화번호 *
                </label>
                <input
                  name="host_phone"
                  value={form.host_phone}
                  onChange={handlePhoneChange}
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
                  나만의 Key * <span className="text-muted-light font-normal">(8자 이상)</span>
                </label>
                <input
                  name="host_key"
                  value={form.host_key}
                  onChange={handleChange}
                  required
                  minLength={8}
                  placeholder="기억하기 쉬운 단어나 숫자"
                  className="w-full bg-input-bg border border-input-border rounded-xl px-4 py-3.5 text-base font-medium placeholder:text-muted-light focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
                />
                <p className="text-xs text-muted mt-1.5">
                  현재 {form.host_key.length}/8자
                  {form.host_key.length >= 8 && (
                    <span className="ml-1 text-success font-bold">✓</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm px-4 py-3 rounded-xl whitespace-pre-wrap">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 btn-primary font-bold text-base py-4 rounded-xl tracking-wide"
          >
            {loading ? "생성 중..." : "이벤트 만들기 →"}
          </button>
        </form>
      </div>
    </main>
  );
}
