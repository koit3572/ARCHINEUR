type PracticeMode = "note" | "feed" | "exam";

type Props = {
  mode: PracticeMode;
  onChange: (mode: PracticeMode) => void;
};

export default function PracticeModeSwitch({ mode, onChange }: Props) {
  const item = (key: PracticeMode, label: string) => (
    <button
      onClick={() => onChange(key)}
      className={`rounded-full px-4 py-2 text-sm transition
        ${
          mode === key
            ? "bg-slate-900 text-white"
            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
        }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mb-6 flex gap-2">
      {item("note", "정리노트")}
      {item("feed", "연습풀이")}
      {item("exam", "실전풀이")}
    </div>
  );
}
