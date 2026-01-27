"use client";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

export default function SidebarHeader({
  title,
  subtitle,
  tone = "default",
}: {
  title: string;
  subtitle?: string;
  tone?: "default" | "toc";
}) {
  return (
    <header className="px-5 pt-5">
      <div
        className={cx(
          "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
          tone === "toc" ? "ring-1 ring-slate-900/5" : "",
        )}
      >
        {/* 상단 바 */}
        <div
          className={cx(
            "h-[3px] w-full",
            tone === "toc" ? "bg-slate-900/10" : "bg-slate-900/5",
          )}
        />

        <div className="px-4 py-4">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
