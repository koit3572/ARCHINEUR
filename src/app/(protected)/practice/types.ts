export type PracticeMode = "note" | "feed" | "exam";

export type TokenMode = "text" | "input";

export type TokenConfig = {
  mode: TokenMode;
  inputRatio: number; // 0 ~ 100
};
