/* =========================================================
   src/lib/mock/db.ts
   LocalStorage 기반 Mock DB
   - SEED_DB: 초기 데이터(예시용, 기존 대비 약 5배)
   - db: 로컬스토리지 CRUD + 캐스케이드 삭제
   - users/roots/...: "읽기 전용 프록시" (기존 import 최대한 호환)
========================================================= */

import { useSyncExternalStore } from "react";

/* =========================
   Row Types
========================= */
export type UserRow = {
  id: string;
  email: string;
  created_at: string;
};

export type RootRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
};

export type FolderRow = {
  id: string;
  root_id: string;
  parent_id: string | null;
  name: string;
  order: number;
  created_at: string;
};

export type NoteRow = {
  id: string;
  folder_id: string;
  title: string;
  content: string; // Markdown 원문 100%
  created_at: string;
  updated_at: string;
};

export type NoteSectionRow = {
  id: string;
  note_id: string;
  order: number;
  title: string;
  created_at: string;
};

export type NoteBlockRow = {
  id: string;
  section_id: string;
  order: number;
  type: "heading" | "text";
  content: string;

  // revised fields
  source_hash: string;
  source_start: number;
  source_end: number;

  created_at: string;
};

export type MockDB = {
  users: UserRow[];
  roots: RootRow[];
  folders: FolderRow[];
  notes: NoteRow[];
  note_sections: NoteSectionRow[];
  note_blocks: NoteBlockRow[];
};

/* =========================
   Storage Key
========================= */
export const STORAGE_KEY = "archineur.mockdb.v1";

/* =========================
   Utils
========================= */
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

/* =========================================================
   SEED_DB (초기 데이터) - 기존 대비 약 5배
========================================================= */
export const SEED_DB: MockDB = {
  /* =========================
     users
  ========================= */
  users: [
    {
      id: "user-1",
      email: "user@example.com",
      created_at: "2026-01-05T10:00:00Z",
    },
    {
      id: "user-2",
      email: "guest@example.com",
      created_at: "2026-01-05T12:00:00Z",
    },
  ],

  /* =========================
     roots
  ========================= */
  roots: [
    {
      id: "root-1",
      user_id: "user-1",
      title: "소방산업기사",
      description: "자격증 공부",
      created_at: "2026-01-05T10:10:00Z",
    },
    {
      id: "root-2",
      user_id: "user-1",
      title: "주식",
      description: "투자 공부",
      created_at: "2026-01-05T11:00:00Z",
    },
    {
      id: "root-3",
      user_id: "user-1",
      title: "소방설비기사",
      description: "심화 이론 + 실무",
      created_at: "2026-01-06T08:00:00Z",
    },
    {
      id: "root-4",
      user_id: "user-2",
      title: "샘플 루트",
      description: "게스트 예시 데이터",
      created_at: "2026-01-06T09:00:00Z",
    },
  ],

  /* =========================
     folders
  ========================= */
  folders: [
    // root-1 (소방산업기사)
    {
      id: "folder-1",
      root_id: "root-1",
      parent_id: null,
      name: "소화설비",
      order: 1,
      created_at: "2026-01-05T10:15:00Z",
    },
    {
      id: "folder-2",
      root_id: "root-1",
      parent_id: null,
      name: "법 개정 정보",
      order: 2,
      created_at: "2026-01-05T10:16:00Z",
    },
    {
      id: "folder-4",
      root_id: "root-1",
      parent_id: null,
      name: "경보설비",
      order: 3,
      created_at: "2026-01-06T10:00:00Z",
    },
    {
      id: "folder-5",
      root_id: "root-1",
      parent_id: null,
      name: "피난구조",
      order: 4,
      created_at: "2026-01-06T10:10:00Z",
    },
    {
      id: "folder-6",
      root_id: "root-1",
      parent_id: null,
      name: "위험물",
      order: 5,
      created_at: "2026-01-06T10:20:00Z",
    },
    {
      id: "folder-7",
      root_id: "root-1",
      parent_id: null,
      name: "기출/암기",
      order: 6,
      created_at: "2026-01-06T10:30:00Z",
    },

    // subfolders under 소화설비
    {
      id: "folder-8",
      root_id: "root-1",
      parent_id: "folder-1",
      name: "옥내소화전",
      order: 1,
      created_at: "2026-01-06T10:40:00Z",
    },
    {
      id: "folder-9",
      root_id: "root-1",
      parent_id: "folder-1",
      name: "스프링클러",
      order: 2,
      created_at: "2026-01-06T10:41:00Z",
    },

    // subfolders under 경보설비
    {
      id: "folder-10",
      root_id: "root-1",
      parent_id: "folder-4",
      name: "자동화재탐지",
      order: 1,
      created_at: "2026-01-06T10:50:00Z",
    },
    {
      id: "folder-11",
      root_id: "root-1",
      parent_id: "folder-4",
      name: "비상방송",
      order: 2,
      created_at: "2026-01-06T10:51:00Z",
    },

    // root-2 (주식)
    {
      id: "folder-3",
      root_id: "root-2",
      parent_id: null,
      name: "환율",
      order: 1,
      created_at: "2026-01-05T11:05:00Z",
    },
    {
      id: "folder-12",
      root_id: "root-2",
      parent_id: null,
      name: "기업분석",
      order: 2,
      created_at: "2026-01-06T11:00:00Z",
    },
    {
      id: "folder-13",
      root_id: "root-2",
      parent_id: null,
      name: "ETF",
      order: 3,
      created_at: "2026-01-06T11:10:00Z",
    },
    {
      id: "folder-14",
      root_id: "root-2",
      parent_id: null,
      name: "포트폴리오",
      order: 4,
      created_at: "2026-01-06T11:20:00Z",
    },
    {
      id: "folder-15",
      root_id: "root-2",
      parent_id: null,
      name: "매매기록",
      order: 5,
      created_at: "2026-01-06T11:30:00Z",
    },
  ],

  /* =========================
     notes (Markdown 원문 100%)
     - 섹션 구분은 --- 를 사용(네 프로젝트 규칙에 맞춤)
  ========================= */
  notes: [
    // 기존 3개
    {
      id: "note-1",
      folder_id: "folder-1",
      title: "옥내소화전설비",
      content: `# 옥내소화전설비
---
## 설치장소
- [연면적 3,000m²이상]([지하가]중 [터널] 제외),[지하층]·[무창층]([축사]는 제외),[층수]가 [4층 이상]인 것 중 [바닥면적 600m²이상]인 층이 있는 [모든]층
- [지하가]중 [터널]로서 [길이]가 [1,000m이상]인 [터널]
---
## 설치 면제 기준
- 옥내소화전을 설치하여야 하는 장소에 [호스릴 방식]의 [미분무소화설비]를 [화재안전기준]에 적합하게 설치한 경우 그 설비의 [유효범휘]에서 설치가 면제된다.
---`,
      created_at: "2026-01-05T10:20:00Z",
      updated_at: "2026-01-05T10:20:00Z",
    },
    {
      id: "note-2",
      folder_id: "folder-2",
      title: "우선경보&전층경보",
      content: `# 우선경보&전층경보
---
## 전층경보
- 법 기준 : [23.02.10 이전]
- 경보 층 : [발화층] + [직상 1개층]
  - 발화층이 1층인 경우 : [발화층(1층)] + [직상 1개층] + [지하층 전체]
  - 발화층이 지하층인 경우 : [발화지하층] + [직상층] + [기타 지하층 전체]
- 대상 기준 : [5층 이상] + [연면적 3000m²]
---
## 우선경보
- 법 기준 : [23.02.10 이후]
- 경보 층 : [발화층] + [직상 4개층]
  - 발화층이 1층인 경우 : [발화층(1층)] + [직상 4개층] + [지하층 전체]
  - 발화층이 지하층인 경우 : [발화지하층] + [직상층] + [기타 지하층 전체]
- 대상 기준 : [일반건물 11층 이상], [공동주택 16층 이상]
---`,
      created_at: "2026-01-05T10:30:00Z",
      updated_at: "2026-01-05T10:30:00Z",
    },
    {
      id: "note-3",
      folder_id: "folder-3",
      title: "환율",
      content: `# 환율
---
## 환율이란
- [달러 환율]이란 [미국 달러]와 [다른 나라] 화폐(예: 한국 원화) 간의 [교환 비율]을 말하며, 즉 다른 나라 [돈의 가격표]입니다.
---`,
      created_at: "2026-01-05T11:10:00Z",
      updated_at: "2026-01-05T11:10:00Z",
    },

    // 추가(확장)
    {
      id: "note-4",
      folder_id: "folder-8",
      title: "옥내소화전 배관/수원",
      content: `# 옥내소화전 배관/수원
---
## 개요
- 옥내소화전은 [수원] → [펌프] → [배관] → [함]으로 공급된다.
- 설계 시 [최대 동시 사용 개수]와 [최원거리]를 기준으로 본다.
---
## 배관/방수 포인트
- 배관은 [동결] 및 [부식] 리스크를 고려한다.
- 펌프실/배관실은 [점검 동선]을 확보한다.
---`,
      created_at: "2026-01-06T10:42:00Z",
      updated_at: "2026-01-06T10:42:00Z",
    },
    {
      id: "note-5",
      folder_id: "folder-9",
      title: "스프링클러 헤드",
      content: `# 스프링클러 헤드
---
## 헤드 종류
- [폐쇄형] : 평상시 닫힘, 감열부 작동 시 개방
- [개방형] : 방출부가 열려있고, [일제개방밸브]로 제어
---
## 설치 기준(기본 감)
- 설치 간격은 [방호면적]과 [살수 반경]을 함께 본다.
- 장애물/보는각(차폐) 고려가 중요하다.
---`,
      created_at: "2026-01-06T10:43:00Z",
      updated_at: "2026-01-06T10:43:00Z",
    },
    {
      id: "note-6",
      folder_id: "folder-10",
      title: "자동화재탐지설비 핵심",
      content: `# 자동화재탐지설비 핵심
---
## 감지기 종류
- [열] : 정온/차동
- [연기] : 광전식/이온화식
- [불꽃] : 자외선/적외선
---
## 경계구역 포인트
- 경계구역은 [층/방화구획/용도]를 기준으로 나눈다.
- 예외는 항상 '관리/점검/경보' 관점에서 생각한다.
---`,
      created_at: "2026-01-06T10:55:00Z",
      updated_at: "2026-01-06T10:55:00Z",
    },
    {
      id: "note-7",
      folder_id: "folder-11",
      title: "비상방송설비 기본",
      content: `# 비상방송설비 기본
---
## 음향장치/앰프
- 안내방송은 [명료도]가 중요하고, [정전] 시에도 동작해야 한다.
---
## 조작/우선순위
- 비상방송은 일반방송보다 우선한다.
- 기동/정지는 [수신기 연동]과 함께 설계된다.
---`,
      created_at: "2026-01-06T10:56:00Z",
      updated_at: "2026-01-06T10:56:00Z",
    },
    {
      id: "note-8",
      folder_id: "folder-5",
      title: "피난기구 요약",
      content: `# 피난기구 요약
---
## 완강기
- 설치장소/대상은 [층수/용도]에 크게 좌우된다.
- 사용법은 '하강 장치 체결 → 안전 확인 → 천천히 하강' 흐름으로 암기.
---
## 피난사다리/구조대
- 설치는 [접근성]과 [안전성]이 우선.
- 평상시 관리가 곧 실효성이다.
---`,
      created_at: "2026-01-06T11:00:00Z",
      updated_at: "2026-01-06T11:00:00Z",
    },
    {
      id: "note-9",
      folder_id: "folder-6",
      title: "위험물 분류(감 잡기)",
      content: `# 위험물 분류(감 잡기)
---
## 분류 프레임
- 제1류: 산화성 고체
- 제2류: 가연성 고체
- 제3류: 자연발화성/금수성
- 제4류: 인화성 액체
- 제5류: 자기반응성
- 제6류: 산화성 액체
---
## 저장/취급 포인트
- [온도/환기/격리] 3가지를 먼저 체크한다.
---`,
      created_at: "2026-01-06T11:02:00Z",
      updated_at: "2026-01-06T11:02:00Z",
    },
    {
      id: "note-10",
      folder_id: "folder-7",
      title: "기출 패턴/암기 포인트",
      content: `# 기출 패턴/암기 포인트
---
## 자주 나오는 구조
- '대상 → 설치기준 → 예외' 순으로 나온다.
- 숫자는 '큰 기준 → 세부 기준'으로 반복해서 외운다.
---
## 빠른 회고
- 틀린 문제는 '왜 틀렸는지' 한 줄로 남긴다.
---`,
      created_at: "2026-01-06T11:05:00Z",
      updated_at: "2026-01-06T11:05:00Z",
    },

    // 주식 쪽 확장
    {
      id: "note-11",
      folder_id: "folder-12",
      title: "KDP 인수 구조(요약)",
      content: `# KDP 인수 구조(요약)
---
## 인수 구조
- 현금/부채 조달 비중에 따라 [레버리지]가 달라진다.
- 시장은 보통 '시너지'보다 '부채/등급'을 먼저 가격에 반영한다.
---
## 리스크/트리거
- 리스크: [순부채/EBITDA], [이자보상배율], [통합 지연]
- 트리거: [가이던스 상향], [신용등급 안정], [마진 개선]
---`,
      created_at: "2026-01-06T11:40:00Z",
      updated_at: "2026-01-06T11:40:00Z",
    },
    {
      id: "note-12",
      folder_id: "folder-12",
      title: "OXY 체크리스트(요약)",
      content: `# OXY 체크리스트(요약)
---
## 투자 체크
- 유가 민감도: [손익분기 유가] 감 잡기
- 재무: [순부채/EBITDA], [FCF], [주식수 추이]
---
## 매수 트리거
- 유가 하락에도 FCF 유지 → 구조적 방어력 확인
- 밸류 5년 분위 하단 + 부채 개선 시그널
---`,
      created_at: "2026-01-06T11:41:00Z",
      updated_at: "2026-01-06T11:41:00Z",
    },
    {
      id: "note-13",
      folder_id: "folder-13",
      title: "VOO vs QQQ (감으로 정리)",
      content: `# VOO vs QQQ (감으로 정리)
---
## 성격 차이
- VOO: 더 넓은 시장, 변동성 상대 낮음
- QQQ: 성장/기술 편중, 변동성 상대 높음
---
## 분할매수
- '한 번에'보다 '규칙'이 중요하다.
- 하락 시나리오를 먼저 쓰고 들어간다.
---`,
      created_at: "2026-01-06T11:42:00Z",
      updated_at: "2026-01-06T11:42:00Z",
    },
    {
      id: "note-14",
      folder_id: "folder-14",
      title: "리밸런싱 규칙(샘플)",
      content: `# 리밸런싱 규칙(샘플)
---
## 목표 비중
- 예: ETF 70 / 개별주 30
- 예: 현금 10~20(심리 안정용)
---
## 리밸런싱
- 월 1회 점검
- 특정 자산이 목표 대비 ±5%p 벗어나면 조정
---`,
      created_at: "2026-01-06T11:43:00Z",
      updated_at: "2026-01-06T11:43:00Z",
    },
    {
      id: "note-15",
      folder_id: "folder-15",
      title: "매매기록 템플릿",
      content: `# 매매기록 템플릿
---
## 기록 항목
- 종목/진입가/근거/손절/목표/리스크
- '내가 틀릴 수 있는 이유' 한 줄
---
## 회고 질문
- 규칙을 지켰나?
- 결과보다 과정이 재현 가능한가?
---`,
      created_at: "2026-01-06T11:44:00Z",
      updated_at: "2026-01-06T11:44:00Z",
    },
  ],

  /* =========================
     note_sections
  ========================= */
  note_sections: [
    // 기존
    {
      id: "section-1",
      note_id: "note-1",
      order: 1,
      title: "설치장소",
      created_at: "2026-01-05T10:21:00Z",
    },
    {
      id: "section-2",
      note_id: "note-1",
      order: 2,
      title: "설치 면제 기준",
      created_at: "2026-01-05T10:22:00Z",
    },
    {
      id: "section-3",
      note_id: "note-2",
      order: 1,
      title: "전층경보",
      created_at: "2026-01-05T10:31:00Z",
    },
    {
      id: "section-4",
      note_id: "note-2",
      order: 2,
      title: "우선경보",
      created_at: "2026-01-05T10:32:00Z",
    },
    {
      id: "section-5",
      note_id: "note-3",
      order: 1,
      title: "환율이란",
      created_at: "2026-01-05T11:11:00Z",
    },

    // note-4
    {
      id: "section-6",
      note_id: "note-4",
      order: 1,
      title: "개요",
      created_at: "2026-01-06T10:42:10Z",
    },
    {
      id: "section-7",
      note_id: "note-4",
      order: 2,
      title: "배관/방수 포인트",
      created_at: "2026-01-06T10:42:20Z",
    },

    // note-5
    {
      id: "section-8",
      note_id: "note-5",
      order: 1,
      title: "헤드 종류",
      created_at: "2026-01-06T10:43:10Z",
    },
    {
      id: "section-9",
      note_id: "note-5",
      order: 2,
      title: "설치 기준",
      created_at: "2026-01-06T10:43:20Z",
    },

    // note-6
    {
      id: "section-10",
      note_id: "note-6",
      order: 1,
      title: "감지기 종류",
      created_at: "2026-01-06T10:55:10Z",
    },
    {
      id: "section-11",
      note_id: "note-6",
      order: 2,
      title: "경계구역 포인트",
      created_at: "2026-01-06T10:55:20Z",
    },

    // note-7
    {
      id: "section-12",
      note_id: "note-7",
      order: 1,
      title: "음향장치/앰프",
      created_at: "2026-01-06T10:56:10Z",
    },
    {
      id: "section-13",
      note_id: "note-7",
      order: 2,
      title: "조작/우선순위",
      created_at: "2026-01-06T10:56:20Z",
    },

    // note-8
    {
      id: "section-14",
      note_id: "note-8",
      order: 1,
      title: "완강기",
      created_at: "2026-01-06T11:00:10Z",
    },
    {
      id: "section-15",
      note_id: "note-8",
      order: 2,
      title: "피난사다리/구조대",
      created_at: "2026-01-06T11:00:20Z",
    },

    // note-9
    {
      id: "section-16",
      note_id: "note-9",
      order: 1,
      title: "분류 프레임",
      created_at: "2026-01-06T11:02:10Z",
    },
    {
      id: "section-17",
      note_id: "note-9",
      order: 2,
      title: "저장/취급 포인트",
      created_at: "2026-01-06T11:02:20Z",
    },

    // note-10
    {
      id: "section-18",
      note_id: "note-10",
      order: 1,
      title: "자주 나오는 구조",
      created_at: "2026-01-06T11:05:10Z",
    },
    {
      id: "section-19",
      note_id: "note-10",
      order: 2,
      title: "빠른 회고",
      created_at: "2026-01-06T11:05:20Z",
    },

    // note-11
    {
      id: "section-20",
      note_id: "note-11",
      order: 1,
      title: "인수 구조",
      created_at: "2026-01-06T11:40:10Z",
    },
    {
      id: "section-21",
      note_id: "note-11",
      order: 2,
      title: "리스크/트리거",
      created_at: "2026-01-06T11:40:20Z",
    },

    // note-12
    {
      id: "section-22",
      note_id: "note-12",
      order: 1,
      title: "투자 체크",
      created_at: "2026-01-06T11:41:10Z",
    },
    {
      id: "section-23",
      note_id: "note-12",
      order: 2,
      title: "매수 트리거",
      created_at: "2026-01-06T11:41:20Z",
    },

    // note-13
    {
      id: "section-24",
      note_id: "note-13",
      order: 1,
      title: "성격 차이",
      created_at: "2026-01-06T11:42:10Z",
    },
    {
      id: "section-25",
      note_id: "note-13",
      order: 2,
      title: "분할매수",
      created_at: "2026-01-06T11:42:20Z",
    },

    // note-14
    {
      id: "section-26",
      note_id: "note-14",
      order: 1,
      title: "목표 비중",
      created_at: "2026-01-06T11:43:10Z",
    },
    {
      id: "section-27",
      note_id: "note-14",
      order: 2,
      title: "리밸런싱",
      created_at: "2026-01-06T11:43:20Z",
    },

    // note-15
    {
      id: "section-28",
      note_id: "note-15",
      order: 1,
      title: "기록 항목",
      created_at: "2026-01-06T11:44:10Z",
    },
    {
      id: "section-29",
      note_id: "note-15",
      order: 2,
      title: "회고 질문",
      created_at: "2026-01-06T11:44:20Z",
    },
  ],

  /* =========================
     note_blocks (revised)
     - 각 섹션: heading + text(1~2개) 구성
  ========================= */
  note_blocks: [
    // note-1
    {
      id: "block-1",
      section_id: "section-1",
      order: 1,
      type: "heading",
      content: "설치장소",
      source_hash: "hash-note-1-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-05T10:21:30Z",
    },
    {
      id: "block-2",
      section_id: "section-1",
      order: 2,
      type: "text",
      content:
        "연면적 3,000m² 이상(지하가 중 터널 제외), 지하층·무창층(축사 제외) 등",
      source_hash: "hash-note-1-v1",
      source_start: 21,
      source_end: 120,
      created_at: "2026-01-05T10:21:40Z",
    },
    {
      id: "block-3",
      section_id: "section-1",
      order: 3,
      type: "text",
      content: "지하가 중 터널 길이 1,000m 이상인 터널",
      source_hash: "hash-note-1-v1",
      source_start: 121,
      source_end: 170,
      created_at: "2026-01-05T10:21:50Z",
    },
    {
      id: "block-4",
      section_id: "section-2",
      order: 1,
      type: "heading",
      content: "설치 면제 기준",
      source_hash: "hash-note-1-v1",
      source_start: 171,
      source_end: 195,
      created_at: "2026-01-05T10:22:10Z",
    },
    {
      id: "block-5",
      section_id: "section-2",
      order: 2,
      type: "text",
      content:
        "호스릴 방식 미분무소화설비가 기준에 적합하면 유효범위 내 설치 면제",
      source_hash: "hash-note-1-v1",
      source_start: 196,
      source_end: 280,
      created_at: "2026-01-05T10:22:20Z",
    },

    // note-2
    {
      id: "block-6",
      section_id: "section-3",
      order: 1,
      type: "heading",
      content: "전층경보",
      source_hash: "hash-note-2-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-05T10:31:30Z",
    },
    {
      id: "block-7",
      section_id: "section-3",
      order: 2,
      type: "text",
      content:
        "법 기준: 23.02.10 이전 / 경보: 발화층 + 직상 1개층(상황별 지하층 포함)",
      source_hash: "hash-note-2-v1",
      source_start: 21,
      source_end: 120,
      created_at: "2026-01-05T10:31:40Z",
    },
    {
      id: "block-8",
      section_id: "section-4",
      order: 1,
      type: "heading",
      content: "우선경보",
      source_hash: "hash-note-2-v1",
      source_start: 121,
      source_end: 140,
      created_at: "2026-01-05T10:32:30Z",
    },
    {
      id: "block-9",
      section_id: "section-4",
      order: 2,
      type: "text",
      content:
        "법 기준: 23.02.10 이후 / 경보: 발화층 + 직상 4개층(상황별 지하층 포함)",
      source_hash: "hash-note-2-v1",
      source_start: 141,
      source_end: 240,
      created_at: "2026-01-05T10:32:40Z",
    },

    // note-3
    {
      id: "block-10",
      section_id: "section-5",
      order: 1,
      type: "heading",
      content: "환율이란",
      source_hash: "hash-note-3-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-05T11:11:30Z",
    },
    {
      id: "block-11",
      section_id: "section-5",
      order: 2,
      type: "text",
      content: "달러와 원화 등의 교환비율(다른 나라 돈의 가격표)",
      source_hash: "hash-note-3-v1",
      source_start: 16,
      source_end: 90,
      created_at: "2026-01-05T11:11:40Z",
    },

    // note-4
    {
      id: "block-12",
      section_id: "section-6",
      order: 1,
      type: "heading",
      content: "개요",
      source_hash: "hash-note-4-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T10:42:30Z",
    },
    {
      id: "block-13",
      section_id: "section-6",
      order: 2,
      type: "text",
      content: "수원 → 펌프 → 배관 → 함 흐름 / 최대 동시 사용 + 최원거리 기준",
      source_hash: "hash-note-4-v1",
      source_start: 21,
      source_end: 120,
      created_at: "2026-01-06T10:42:40Z",
    },
    {
      id: "block-14",
      section_id: "section-7",
      order: 1,
      type: "heading",
      content: "배관/방수 포인트",
      source_hash: "hash-note-4-v1",
      source_start: 121,
      source_end: 150,
      created_at: "2026-01-06T10:42:50Z",
    },
    {
      id: "block-15",
      section_id: "section-7",
      order: 2,
      type: "text",
      content: "동결/부식 + 점검 동선 확보(펌프실/배관실)",
      source_hash: "hash-note-4-v1",
      source_start: 151,
      source_end: 220,
      created_at: "2026-01-06T10:43:00Z",
    },

    // note-5
    {
      id: "block-16",
      section_id: "section-8",
      order: 1,
      type: "heading",
      content: "헤드 종류",
      source_hash: "hash-note-5-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T10:43:30Z",
    },
    {
      id: "block-17",
      section_id: "section-8",
      order: 2,
      type: "text",
      content: "폐쇄형(감열부 작동 시 개방) / 개방형(일제개방밸브 제어)",
      source_hash: "hash-note-5-v1",
      source_start: 21,
      source_end: 120,
      created_at: "2026-01-06T10:43:40Z",
    },
    {
      id: "block-18",
      section_id: "section-9",
      order: 1,
      type: "heading",
      content: "설치 기준",
      source_hash: "hash-note-5-v1",
      source_start: 121,
      source_end: 150,
      created_at: "2026-01-06T10:43:50Z",
    },
    {
      id: "block-19",
      section_id: "section-9",
      order: 2,
      type: "text",
      content: "방호면적/살수반경 + 장애물 차폐 고려",
      source_hash: "hash-note-5-v1",
      source_start: 151,
      source_end: 220,
      created_at: "2026-01-06T10:44:00Z",
    },

    // note-6
    {
      id: "block-20",
      section_id: "section-10",
      order: 1,
      type: "heading",
      content: "감지기 종류",
      source_hash: "hash-note-6-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T10:55:30Z",
    },
    {
      id: "block-21",
      section_id: "section-10",
      order: 2,
      type: "text",
      content: "열(정온/차동), 연기(광전/이온), 불꽃(자외/적외)",
      source_hash: "hash-note-6-v1",
      source_start: 21,
      source_end: 120,
      created_at: "2026-01-06T10:55:40Z",
    },
    {
      id: "block-22",
      section_id: "section-11",
      order: 1,
      type: "heading",
      content: "경계구역 포인트",
      source_hash: "hash-note-6-v1",
      source_start: 121,
      source_end: 150,
      created_at: "2026-01-06T10:55:50Z",
    },
    {
      id: "block-23",
      section_id: "section-11",
      order: 2,
      type: "text",
      content: "층/방화구획/용도 기준 + 관리/점검/경보 관점으로 예외 해석",
      source_hash: "hash-note-6-v1",
      source_start: 151,
      source_end: 260,
      created_at: "2026-01-06T10:56:00Z",
    },

    // note-7
    {
      id: "block-24",
      section_id: "section-12",
      order: 1,
      type: "heading",
      content: "음향장치/앰프",
      source_hash: "hash-note-7-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T10:56:30Z",
    },
    {
      id: "block-25",
      section_id: "section-12",
      order: 2,
      type: "text",
      content: "명료도 + 정전 대비(비상전원) 중요",
      source_hash: "hash-note-7-v1",
      source_start: 21,
      source_end: 90,
      created_at: "2026-01-06T10:56:40Z",
    },
    {
      id: "block-26",
      section_id: "section-13",
      order: 1,
      type: "heading",
      content: "조작/우선순위",
      source_hash: "hash-note-7-v1",
      source_start: 91,
      source_end: 120,
      created_at: "2026-01-06T10:56:50Z",
    },
    {
      id: "block-27",
      section_id: "section-13",
      order: 2,
      type: "text",
      content: "비상방송 > 일반방송 / 수신기 연동 포함해 설계",
      source_hash: "hash-note-7-v1",
      source_start: 121,
      source_end: 210,
      created_at: "2026-01-06T10:57:00Z",
    },

    // note-8
    {
      id: "block-28",
      section_id: "section-14",
      order: 1,
      type: "heading",
      content: "완강기",
      source_hash: "hash-note-8-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:00:30Z",
    },
    {
      id: "block-29",
      section_id: "section-14",
      order: 2,
      type: "text",
      content: "대상/층수/용도 영향 큼 / 사용 흐름으로 암기",
      source_hash: "hash-note-8-v1",
      source_start: 16,
      source_end: 120,
      created_at: "2026-01-06T11:00:40Z",
    },
    {
      id: "block-30",
      section_id: "section-15",
      order: 1,
      type: "heading",
      content: "피난사다리/구조대",
      source_hash: "hash-note-8-v1",
      source_start: 121,
      source_end: 150,
      created_at: "2026-01-06T11:00:50Z",
    },
    {
      id: "block-31",
      section_id: "section-15",
      order: 2,
      type: "text",
      content: "접근성/안전성 우선 + 평상시 관리가 실효성",
      source_hash: "hash-note-8-v1",
      source_start: 151,
      source_end: 240,
      created_at: "2026-01-06T11:01:00Z",
    },

    // note-9
    {
      id: "block-32",
      section_id: "section-16",
      order: 1,
      type: "heading",
      content: "분류 프레임",
      source_hash: "hash-note-9-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:02:30Z",
    },
    {
      id: "block-33",
      section_id: "section-16",
      order: 2,
      type: "text",
      content: "제1~6류 큰 틀을 먼저 잡고 세부를 붙인다",
      source_hash: "hash-note-9-v1",
      source_start: 16,
      source_end: 110,
      created_at: "2026-01-06T11:02:40Z",
    },
    {
      id: "block-34",
      section_id: "section-17",
      order: 1,
      type: "heading",
      content: "저장/취급 포인트",
      source_hash: "hash-note-9-v1",
      source_start: 111,
      source_end: 140,
      created_at: "2026-01-06T11:02:50Z",
    },
    {
      id: "block-35",
      section_id: "section-17",
      order: 2,
      type: "text",
      content: "온도/환기/격리 3요소부터 체크",
      source_hash: "hash-note-9-v1",
      source_start: 141,
      source_end: 200,
      created_at: "2026-01-06T11:03:00Z",
    },

    // note-10
    {
      id: "block-36",
      section_id: "section-18",
      order: 1,
      type: "heading",
      content: "자주 나오는 구조",
      source_hash: "hash-note-10-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T11:05:30Z",
    },
    {
      id: "block-37",
      section_id: "section-18",
      order: 2,
      type: "text",
      content: "대상→설치기준→예외 / 숫자는 큰 기준→세부 기준",
      source_hash: "hash-note-10-v1",
      source_start: 21,
      source_end: 130,
      created_at: "2026-01-06T11:05:40Z",
    },
    {
      id: "block-38",
      section_id: "section-19",
      order: 1,
      type: "heading",
      content: "빠른 회고",
      source_hash: "hash-note-10-v1",
      source_start: 131,
      source_end: 150,
      created_at: "2026-01-06T11:05:50Z",
    },
    {
      id: "block-39",
      section_id: "section-19",
      order: 2,
      type: "text",
      content: "왜 틀렸는지 한 줄로 남기기(재발 방지)",
      source_hash: "hash-note-10-v1",
      source_start: 151,
      source_end: 220,
      created_at: "2026-01-06T11:06:00Z",
    },

    // note-11
    {
      id: "block-40",
      section_id: "section-20",
      order: 1,
      type: "heading",
      content: "인수 구조",
      source_hash: "hash-note-11-v1",
      source_start: 0,
      source_end: 20,
      created_at: "2026-01-06T11:40:30Z",
    },
    {
      id: "block-41",
      section_id: "section-20",
      order: 2,
      type: "text",
      content:
        "현금/부채 조달 비중 → 레버리지 변화 / 시장은 부채/등급을 먼저 반영",
      source_hash: "hash-note-11-v1",
      source_start: 21,
      source_end: 150,
      created_at: "2026-01-06T11:40:40Z",
    },
    {
      id: "block-42",
      section_id: "section-21",
      order: 1,
      type: "heading",
      content: "리스크/트리거",
      source_hash: "hash-note-11-v1",
      source_start: 151,
      source_end: 180,
      created_at: "2026-01-06T11:40:50Z",
    },
    {
      id: "block-43",
      section_id: "section-21",
      order: 2,
      type: "text",
      content:
        "리스크: 순부채/EBITDA, 이자보상, 통합지연 / 트리거: 가이던스 상향, 마진 개선",
      source_hash: "hash-note-11-v1",
      source_start: 181,
      source_end: 320,
      created_at: "2026-01-06T11:41:00Z",
    },

    // note-12
    {
      id: "block-44",
      section_id: "section-22",
      order: 1,
      type: "heading",
      content: "투자 체크",
      source_hash: "hash-note-12-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:41:30Z",
    },
    {
      id: "block-45",
      section_id: "section-22",
      order: 2,
      type: "text",
      content: "유가 민감도/손익분기 + 순부채/EBITDA + FCF + 주식수 추이",
      source_hash: "hash-note-12-v1",
      source_start: 16,
      source_end: 130,
      created_at: "2026-01-06T11:41:40Z",
    },
    {
      id: "block-46",
      section_id: "section-23",
      order: 1,
      type: "heading",
      content: "매수 트리거",
      source_hash: "hash-note-12-v1",
      source_start: 131,
      source_end: 160,
      created_at: "2026-01-06T11:41:50Z",
    },
    {
      id: "block-47",
      section_id: "section-23",
      order: 2,
      type: "text",
      content: "유가 하락에도 FCF 유지 + 밸류 하단 분위 + 부채 개선 시그널",
      source_hash: "hash-note-12-v1",
      source_start: 161,
      source_end: 260,
      created_at: "2026-01-06T11:42:00Z",
    },

    // note-13
    {
      id: "block-48",
      section_id: "section-24",
      order: 1,
      type: "heading",
      content: "성격 차이",
      source_hash: "hash-note-13-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:42:30Z",
    },
    {
      id: "block-49",
      section_id: "section-24",
      order: 2,
      type: "text",
      content: "VOO(넓은 시장/상대 안정) vs QQQ(성장 편중/상대 변동)",
      source_hash: "hash-note-13-v1",
      source_start: 16,
      source_end: 130,
      created_at: "2026-01-06T11:42:40Z",
    },
    {
      id: "block-50",
      section_id: "section-25",
      order: 1,
      type: "heading",
      content: "분할매수",
      source_hash: "hash-note-13-v1",
      source_start: 131,
      source_end: 150,
      created_at: "2026-01-06T11:42:50Z",
    },
    {
      id: "block-51",
      section_id: "section-25",
      order: 2,
      type: "text",
      content: "한 번에보다 규칙 / 하락 시나리오를 먼저 작성",
      source_hash: "hash-note-13-v1",
      source_start: 151,
      source_end: 230,
      created_at: "2026-01-06T11:43:00Z",
    },

    // note-14
    {
      id: "block-52",
      section_id: "section-26",
      order: 1,
      type: "heading",
      content: "목표 비중",
      source_hash: "hash-note-14-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:43:30Z",
    },
    {
      id: "block-53",
      section_id: "section-26",
      order: 2,
      type: "text",
      content: "예: ETF 70/개별 30 + 현금 10~20(심리 안정)",
      source_hash: "hash-note-14-v1",
      source_start: 16,
      source_end: 120,
      created_at: "2026-01-06T11:43:40Z",
    },
    {
      id: "block-54",
      section_id: "section-27",
      order: 1,
      type: "heading",
      content: "리밸런싱",
      source_hash: "hash-note-14-v1",
      source_start: 121,
      source_end: 140,
      created_at: "2026-01-06T11:43:50Z",
    },
    {
      id: "block-55",
      section_id: "section-27",
      order: 2,
      type: "text",
      content: "월 1회 점검 / 목표 대비 ±5%p 벗어나면 조정",
      source_hash: "hash-note-14-v1",
      source_start: 141,
      source_end: 220,
      created_at: "2026-01-06T11:44:00Z",
    },

    // note-15
    {
      id: "block-56",
      section_id: "section-28",
      order: 1,
      type: "heading",
      content: "기록 항목",
      source_hash: "hash-note-15-v1",
      source_start: 0,
      source_end: 15,
      created_at: "2026-01-06T11:44:30Z",
    },
    {
      id: "block-57",
      section_id: "section-28",
      order: 2,
      type: "text",
      content: "종목/진입가/근거/손절/목표/리스크 + 내가 틀릴 수 있는 이유",
      source_hash: "hash-note-15-v1",
      source_start: 16,
      source_end: 140,
      created_at: "2026-01-06T11:44:40Z",
    },
    {
      id: "block-58",
      section_id: "section-29",
      order: 1,
      type: "heading",
      content: "회고 질문",
      source_hash: "hash-note-15-v1",
      source_start: 141,
      source_end: 160,
      created_at: "2026-01-06T11:44:50Z",
    },
    {
      id: "block-59",
      section_id: "section-29",
      order: 2,
      type: "text",
      content: "규칙을 지켰나? 결과보다 과정이 재현 가능한가?",
      source_hash: "hash-note-15-v1",
      source_start: 161,
      source_end: 220,
      created_at: "2026-01-06T11:45:00Z",
    },
  ],
};

/* =========================================================
   LocalStorage I/O
========================================================= */
function normalizeDB(input: any): MockDB {
  const base = deepClone(SEED_DB);
  if (!input || typeof input !== "object") return base;

  return {
    users: Array.isArray(input.users) ? input.users : base.users,
    roots: Array.isArray(input.roots) ? input.roots : base.roots,
    folders: Array.isArray(input.folders) ? input.folders : base.folders,
    notes: Array.isArray(input.notes) ? input.notes : base.notes,
    note_sections: Array.isArray(input.note_sections)
      ? input.note_sections
      : base.note_sections,
    note_blocks: Array.isArray(input.note_blocks)
      ? input.note_blocks
      : base.note_blocks,
  };
}

function readRaw(): MockDB {
  if (!isBrowser()) return deepClone(SEED_DB);

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return deepClone(SEED_DB);

  try {
    return normalizeDB(JSON.parse(raw));
  } catch {
    return deepClone(SEED_DB);
  }
}

function writeRaw(db: MockDB) {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/* =========================================================
   Subscribe (for hooks / live update)
========================================================= */
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribeMockDB(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (isBrowser()) {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) emit();
  });
}

/* =========================================================
   Public API (db)
========================================================= */
export const db = {
  /** 최초 1회: 로컬스토리지에 seed를 심어둠 */
  ensure() {
    if (!isBrowser()) return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DB));
      emit();
    }
  },

  /** 현재 DB 스냅샷 읽기 */
  read(): MockDB {
    // 브라우저면 ensure를 자동으로 한 번 보장
    if (isBrowser()) this.ensure();
    return readRaw();
  },

  /** DB 통째로 저장 */
  write(next: MockDB) {
    if (isBrowser()) this.ensure();
    writeRaw(next);
    emit();
  },

  /** seed로 초기화 */
  reset() {
    this.write(deepClone(SEED_DB));
  },

  /** 업데이트(뮤테이션 방식) */
  update(mutator: (draft: MockDB) => void) {
    const draft = this.read();
    mutator(draft);
    this.write(draft);
    return draft;
  },

  /** 테이블 insert */
  insert<T extends keyof MockDB>(table: T, row: MockDB[T][number]) {
    return this.update((d) => {
      (d[table] as any).push(row);
    });
  },

  /** id로 update (partial) */
  updateById<T extends keyof MockDB>(
    table: T,
    id: string,
    patch: Partial<MockDB[T][number]>
  ) {
    return this.update((d) => {
      const arr = d[table] as any[];
      const idx = arr.findIndex((r) => r?.id === id);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...patch };
    });
  },

  /** id로 delete (단순) */
  removeById<T extends keyof MockDB>(table: T, id: string) {
    return this.update((d) => {
      d[table] = (d[table] as any[]).filter((r) => r?.id !== id) as any;
    });
  },

  /* =========================
     Cascade helpers
     - 노트/폴더 삭제 시 연관 테이블 정리
  ========================= */

  /** 노트 삭제 + section/block 캐스케이드 */
  deleteNote(noteId: string) {
    return this.update((d) => {
      // note 제거
      d.notes = d.notes.filter((n) => n.id !== noteId);

      // 섹션 찾기
      const sectionIds = d.note_sections
        .filter((s) => s.note_id === noteId)
        .map((s) => s.id);

      // 섹션 제거
      d.note_sections = d.note_sections.filter((s) => s.note_id !== noteId);

      // 블록 제거
      d.note_blocks = d.note_blocks.filter(
        (b) => !sectionIds.includes(b.section_id)
      );
    });
  },

  /** 폴더 삭제(하위 폴더 포함) + 그 안의 노트/섹션/블록 캐스케이드 */
  deleteFolder(folderId: string) {
    return this.update((d) => {
      // 1) 하위 폴더 id 수집 (재귀)
      const allFolderIds = new Set<string>();
      const stack = [folderId];

      while (stack.length) {
        const cur = stack.pop()!;
        if (allFolderIds.has(cur)) continue;
        allFolderIds.add(cur);

        const children = d.folders
          .filter((f) => f.parent_id === cur)
          .map((f) => f.id);
        for (const c of children) stack.push(c);
      }

      // 2) 해당 폴더들에 속한 노트 id 수집
      const noteIds = d.notes
        .filter((n) => allFolderIds.has(n.folder_id))
        .map((n) => n.id);

      // 3) note_sections / note_blocks 정리
      const sectionIds = d.note_sections
        .filter((s) => noteIds.includes(s.note_id))
        .map((s) => s.id);

      d.note_blocks = d.note_blocks.filter(
        (b) => !sectionIds.includes(b.section_id)
      );
      d.note_sections = d.note_sections.filter(
        (s) => !noteIds.includes(s.note_id)
      );
      d.notes = d.notes.filter((n) => !allFolderIds.has(n.folder_id));

      // 4) folders 정리
      d.folders = d.folders.filter((f) => !allFolderIds.has(f.id));
    });
  },

  /** 루트 삭제 + 폴더/노트/섹션/블록 캐스케이드 */
  deleteRoot(rootId: string) {
    return this.update((d) => {
      // 루트에 속한 최상위 폴더부터 캐스케이드 삭제
      const rootFolderIds = d.folders
        .filter((f) => f.root_id === rootId)
        .map((f) => f.id);
      // 캐스케이드 로직 재사용 (local set에서 제거되므로, 여기선 직접 정리)
      const allFolderIds = new Set<string>();
      const stack = [...rootFolderIds];

      while (stack.length) {
        const cur = stack.pop()!;
        if (allFolderIds.has(cur)) continue;
        allFolderIds.add(cur);
        const children = d.folders
          .filter((f) => f.parent_id === cur)
          .map((f) => f.id);
        for (const c of children) stack.push(c);
      }

      const noteIds = d.notes
        .filter((n) => allFolderIds.has(n.folder_id))
        .map((n) => n.id);
      const sectionIds = d.note_sections
        .filter((s) => noteIds.includes(s.note_id))
        .map((s) => s.id);

      d.note_blocks = d.note_blocks.filter(
        (b) => !sectionIds.includes(b.section_id)
      );
      d.note_sections = d.note_sections.filter(
        (s) => !noteIds.includes(s.note_id)
      );
      d.notes = d.notes.filter((n) => !allFolderIds.has(n.folder_id));
      d.folders = d.folders.filter((f) => f.root_id !== rootId);
      d.roots = d.roots.filter((r) => r.id !== rootId);
    });
  },

  /* =========================
     Convenience creators
  ========================= */
  createNote(args: { folder_id: string; title: string; content: string }) {
    const id = uid("note");
    const ts = nowIso();
    const row: NoteRow = {
      id,
      folder_id: args.folder_id,
      title: args.title,
      content: args.content,
      created_at: ts,
      updated_at: ts,
    };
    this.insert("notes", row);
    return row;
  },

  createFolder(args: {
    root_id: string;
    parent_id: string | null;
    name: string;
    order?: number;
  }) {
    const id = uid("folder");
    const ts = nowIso();
    const order =
      typeof args.order === "number"
        ? args.order
        : this.read().folders.filter(
            (f) => f.root_id === args.root_id && f.parent_id === args.parent_id
          ).length + 1;

    const row: FolderRow = {
      id,
      root_id: args.root_id,
      parent_id: args.parent_id,
      name: args.name,
      order,
      created_at: ts,
    };
    this.insert("folders", row);
    return row;
  },
};

/* =========================================================
   "읽기 전용 프록시" exports (기존 import 호환용)
   - 읽기는 항상 최신(localStorage) 스냅샷을 바라봄
   - ⚠️ 수정/삭제는 반드시 db API 사용
========================================================= */
function tableProxy<T extends keyof MockDB>(table: T): MockDB[T] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Proxy([] as any, {
    get(_t, prop) {
      const arr = db.read()[table] as any;
      const v = arr[prop as any];
      return typeof v === "function" ? v.bind(arr) : v;
    },
    has(_t, prop) {
      const arr = db.read()[table] as any;
      return prop in arr;
    },
    ownKeys() {
      const arr = db.read()[table] as any;
      return Reflect.ownKeys(arr);
    },
    getOwnPropertyDescriptor(_t, prop) {
      const arr = db.read()[table] as any;
      const desc = Object.getOwnPropertyDescriptor(arr, prop);
      return (
        desc ?? {
          configurable: true,
          enumerable: true,
          writable: false,
          value: undefined,
        }
      );
    },
  });
}

export const users = tableProxy("users");
export const roots = tableProxy("roots");
export const folders = tableProxy("folders");
export const notes = tableProxy("notes");
export const note_sections = tableProxy("note_sections");
export const note_blocks = tableProxy("note_blocks");

/* =========================================================
   React Hook (선택)
   - 컴포넌트에서 테이블을 "자동 갱신"으로 쓰고 싶을 때
========================================================= */
export function useMockTable<T extends keyof MockDB>(table: T): MockDB[T] {
  const snapshot = useSyncExternalStore(
    subscribeMockDB,
    () => db.read()[table],
    () => SEED_DB[table]
  );
  return snapshot;
}
