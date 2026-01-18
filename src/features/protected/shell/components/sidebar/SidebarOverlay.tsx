"use client";

export default function SidebarOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      className={[
        "fixed inset-0 z-40 bg-black/30 transition-opacity",
        "lg:hidden",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    />
  );
}
