# INVITO RSVP MVP — 시스템 구조

## 아키텍처

```
[호스트 브라우저]          [게스트 브라우저]
  /create                   /event/[id]
  /manage/[id]                   │
       │                         │
       └──────── Supabase ────────┘
                (DB + Realtime)
```

- UI는 Next.js (Vercel 배포 시 공개 URL 생성)
- 데이터는 Supabase에 저장 → 호스트 PC가 꺼져도 유지
- 게스트는 URL 하나로 로그인 없이 접속

---

## 페이지 구조

| 경로 | 역할 | 접근 |
|---|---|---|
| `/create` | 이벤트 생성 폼 | 호스트 |
| `/manage/[id]` | RSVP 목록 실시간 확인, 게스트 링크 복사 | 호스트 (Phone + Key 인증) |
| `/event/[id]` | 참석 여부 입력 | 게스트 (이름만 입력) |

---

## Locker Logic (인증 방식)

- 이메일/비밀번호 없음
- 호스트: **전화번호 + 8자리 Key** 조합으로 크로스디바이스 접근
- 자격증명은 localStorage에 캐싱 → 같은 기기에서 자동 로그인
- 게스트: 이름만 입력, localStorage에 저장하여 재방문 시 자동 채워짐

---

## DB 스키마 (Supabase)

```sql
events
- id (UUID, PK)
- title (TEXT)
- date (TEXT)
- location (TEXT)
- host_name (TEXT)       ← 개최자 이름
- host_phone (TEXT)      ← 인증용
- host_key (TEXT)        ← 인증용
- image_url (TEXT)       ← 이벤트 이미지 (Supabase Storage)
- created_at (TIMESTAMPTZ)

rsvps
- id (BIGINT, PK)
- event_id (UUID, FK)
- guest_name (TEXT)
- is_coming (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

---

## 파일 구조

```
invito-rsvp/
├── .env.local                  ← Supabase URL + Anon Key
├── supabase_schema.sql         ← DB 초기화 쿼리
├── lib/
│   └── supabase.ts             ← Supabase 클라이언트 싱글톤
└── app/
    ├── layout.tsx              ← Pretendard 폰트, 메타데이터
    ├── globals.css             ← 브랜딩 (흑백 + #FEE500 강조)
    ├── page.tsx                ← / → /create 리디렉션
    ├── create/page.tsx         ← 이벤트 생성
    ├── manage/[id]/page.tsx    ← 호스트 대시보드
    └── event/[id]/page.tsx     ← 게스트 RSVP
```

---

## 배포

- **Vercel** 연동 시 자동 CI/CD
- Supabase 환경변수를 Vercel에도 동일하게 입력 필요
- 배포 후 게스트 링크: `https://[vercel-domain]/event/[id]`

---

## TODO (다음 개선)

- [ ] 개최자 이름 필드 추가
- [ ] 날짜 달력 picker
- [ ] 전화번호 자동 포맷 (- 없이 입력)
- [ ] 이벤트 이미지 업로드 (Supabase Storage)
- [ ] Vercel 배포
