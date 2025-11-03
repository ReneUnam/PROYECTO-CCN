import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  "inline-flex items-center justify-center select-none rounded-xl font-medium " +
  "transition-[transform,box-shadow,background-color,opacity] duration-150 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)] " +
  "focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-surface)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

const variants: Record<Variant, string> = {
  primary:
    "cursor-pointer text-white bg-[color:var(--color-primary)] shadow-md " +
    "hover:-translate-y-0.5 hover:shadow-lg hover:brightness-105 " +
    "active:translate-y-[1px] active:brightness-95",
  outline:
    "cursor-pointer border border-[color:var(--color-border)] " +
    "bg-[color:var(--color-surface)] text-[color:var(--color-text)] shadow-sm " +
    "hover:-translate-y-0.5 hover:shadow-md hover:bg-black/5 dark:hover:bg-white/10 " +
    "active:translate-y-[1px]",
  ghost:
    "cursor-pointer bg-transparent text-[color:var(--color-text)] " +
    "hover:bg-black/5 dark:hover:bg-white/10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, sizes[size], variants[variant], className)}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";