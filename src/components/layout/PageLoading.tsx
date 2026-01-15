export default function PageLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
        <p className="text-sm">로딩 중…</p>
      </div>
    </main>
  );
}
