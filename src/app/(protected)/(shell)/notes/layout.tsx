import type { ReactNode } from "react";

export default function NotesLayout({ children }: { children: ReactNode }) {
  /**
   * ✅ 목표
   * - 브라우저(body) 스크롤이 생기지 않도록
   * - notes 화면은 "부모가 준 높이" 안에서만 동작
   *
   * (shell) 레이아웃이 올바르게 min-h-0/h-full을 넘겨주면 이걸로 body 스크롤이 사라짐.
   */
  return <div className="">{children}</div>;
}
