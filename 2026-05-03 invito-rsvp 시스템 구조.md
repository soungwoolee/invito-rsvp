# invito-rsvp 시스템 구조
2026-05-03 기준

---

## 1. 전체 시스템 아키텍처

```mermaid
graph TB
    subgraph "프론트엔드 (Next.js / Vercel)"
        A["/create<br>이벤트 생성"] --> B["/manage/[id]<br>호스트 대시보드"]
        A --> C["/event/[id]<br>게스트 초대 페이지"]
        B --> C
    end

    subgraph "백엔드 (Supabase)"
        D[(events)]
        E[(rsvps)]
        F[(activities)]
        G[(activity_likes)]
        H[(comments)]
        I[(guests)]
        J[Storage<br>event-images]
    end

    A -->|insert| D
    A -->|upload| J
    C -->|insert/update| E
    C -->|upload| J
    C -->|insert| F
    C -->|insert/delete| G
    C -->|insert/update/delete| H
    B -->|read| E
    B -->|insert/delete| I
    B -->|insert| F
    B -->|insert| H
    E -.->|Realtime 구독| C
    H -.->|Realtime 구독| C
    F -.->|Realtime 구독| C
```

---

## 2. DB 스키마 (ERD)

```mermaid
erDiagram
    events {
        uuid id PK
        timestamp created_at
        text title
        text date
        text location
        text description
        text host_name
        text host_phone
        text host_key
        text image_url
    }

    rsvps {
        bigint id PK
        uuid event_id FK
        text guest_name
        text phone
        boolean is_coming "nullable (null=미정)"
        text avatar
        text photo_url
        timestamp created_at
    }

    activities {
        bigint id PK
        uuid event_id FK
        text name
        text created_by
        timestamp created_at
    }

    activity_likes {
        bigint id PK
        bigint activity_id FK
        text guest_name "형식: 이름:이모지"
        timestamp created_at
    }

    comments {
        bigint id PK
        uuid event_id FK
        text guest_name
        text content
        bigint parent_id FK "nullable (대댓글)"
        timestamp created_at
    }

    guests {
        bigint id PK
        uuid event_id FK
        text name
        text phone
        timestamp invited_at
        timestamp reminder_sent_at
        timestamp created_at
    }

    events ||--o{ rsvps : "has"
    events ||--o{ activities : "has"
    events ||--o{ comments : "has"
    events ||--o{ guests : "has"
    activities ||--o{ activity_likes : "has"
    comments ||--o{ comments : "parent_id (대댓글)"
```

---

## 3. 유저 플로우

```mermaid
flowchart LR
    subgraph "호스트"
        H1["/create 접속"] --> H2["이벤트 정보 입력<br>제목/날짜/장소/이미지/설명"]
        H2 --> H3["이벤트 만들기 클릭"]
        H3 --> H4["/manage/[id]<br>대시보드"]
        H4 --> H5["게스트 링크 복사"]
        H4 --> H6["참석 현황 확인<br>참석/미정/불참"]
        H4 --> H7["게스트 번호 등록<br>리마인더 발송"]
        H4 --> H8["댓글/활동 참여"]
    end

    subgraph "게스트"
        G1["카톡으로 링크 수신"] --> G2["/event/[id] 접속"]
        G2 --> G3["이름 + 전화번호 입력"]
        G3 --> G4["캐릭터 선택 + 사진 업로드"]
        G4 --> G5["참석/미정/불참 선택"]
        G5 --> G6["RSVP 완료"]
        G6 --> G7["활동 제안 + 리액션"]
        G6 --> G8["댓글 남기기"]
        G6 --> G9["참석자 목록 확인<br>(8명 이상 시 공개)"]
    end

    H5 -->|링크 공유| G1
```

---

## 4. 페이지별 컴포넌트 구조

```mermaid
graph TD
    subgraph "app/"
        P1["page.tsx<br>/ → /create 리다이렉트"]
        P2["layout.tsx<br>공통 레이아웃"]
    end

    subgraph "app/create/"
        C1["page.tsx<br>이벤트 생성 폼"]
    end

    subgraph "app/event/[id]/"
        E1["page.tsx<br>게스트 초대 페이지"]
        E1 --> E2["Activities.tsx<br>활동 제안 + 이모지 리액션"]
        E1 --> E3["Comments.tsx<br>댓글/대댓글/수정/삭제"]
    end

    subgraph "app/manage/[id]/"
        M1["page.tsx<br>호스트 대시보드"]
        M1 --> M2["GuestManager.tsx<br>게스트 번호 등록 + 리마인더"]
        M1 --> M3["Activities.tsx"]
        M1 --> M4["Comments.tsx"]
    end

    subgraph "미사용 (보관중)"
        X1["MiniRoom.tsx<br>파티룸 (제거됨)"]
        X2["GuestGalaxy.tsx<br>은하계 (제거됨)"]
    end
```

---

## 5. 배포 구조

```mermaid
graph LR
    subgraph "개발"
        DEV1["Cursor (회사컴)<br>코드 편집"]
        DEV2["VS Code (개인컴)<br>npm run dev 테스트"]
        DEV1 <-->|OneDrive 동기화| DEV2
    end

    subgraph "배포"
        V1["Vercel CLI"]
        V2["Vercel 서버<br>Next.js 빌드 + 호스팅"]
        V1 -->|vercel --prod| V2
    end

    subgraph "백엔드"
        S1["Supabase<br>DB + Storage + Realtime"]
    end

    DEV2 --> V1
    V2 <-->|API 호출| S1

    subgraph "환경변수"
        ENV1["NEXT_PUBLIC_SUPABASE_URL"]
        ENV2["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    end

    ENV1 --> V2
    ENV2 --> V2
    ENV1 --> DEV2
    ENV2 --> DEV2
```

---

## 6. 색상 팔레트

| 용도 | 색상 | 코드 |
|------|------|------|
| 배경 | Beige | `#EFEFD0` |
| 카드/인풋 | White | `#FFFFFF` |
| 메인 액센트 | Orange Crayola | `#FF6B35` |
| 참석/CTA | Polynesian Blue | `#004E89` |
| 미정 | Peach | `#F7C59F` |
| 보조 블루 | Lapis Lazuli | `#1A659E` |
| 텍스트 | Dark | `#1a1a1a` |
| 보조 텍스트 | Muted | `#555550` |

---

## 7. 현재 상태 요약

- **프론트엔드**: Next.js 16 + React 19 + Tailwind CSS v4
- **백엔드**: Supabase (PostgreSQL + Storage + Realtime)
- **배포**: Vercel (미완 — 환경변수 설정 후 Redeploy 필요)
- **인증**: Supabase Auth 미사용, 호스트=폰+키, 게스트=이름+폰으로 식별
- **실시간**: RSVP/댓글/활동 Realtime 구독
- **SMS 리마인더**: UI만 구현, 실제 발송 미연동
