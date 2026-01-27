"use client";

/* =========================================================
   src/lib/data/index.ts
   ✅ 엔트리 파일 (컴포넌트들은 여기만 import)
   - 내부 구현은 파일로 분리
========================================================= */

export * from "./types";
export * from "./api";
export * from "./hooks";

import { db } from "./api";
export default db;
