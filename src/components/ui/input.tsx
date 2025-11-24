import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm placeholder:text-[color:var(--color-placeholder)] focus:border-[color:var(--color-primary)] focus:ring-1 focus:ring-[color:var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';