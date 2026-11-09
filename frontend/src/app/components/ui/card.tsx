import * as React from "react";
import { cn } from "./utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-card card-hover rounded-[14px] text-slate-900 dark:text-white",
        className
      )}
      {...props}
    />
  );
}
