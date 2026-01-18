"use client";

import * as React from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

function cx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export default function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50";

  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-[12px]",
    md: "h-10 px-4 text-[13px]",
    lg: "h-11 px-5 text-[14px]",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:bg-slate-950",
    secondary:
      "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 active:bg-slate-100",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 active:bg-slate-200",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {loading ? <Spinner className="opacity-90" /> : leftIcon}
      <span className={cx(loading && "opacity-90")}>{children}</span>
      {rightIcon}
    </button>
  );
}
