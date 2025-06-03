"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LuCheck } from "react-icons/lu";

export interface CheckboxProps extends React.ComponentPropsWithoutRef<"input"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          ref={ref}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          {...props}
        />
        <div
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
            "cursor-pointer",
            checked
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input bg-background hover:bg-accent hover:text-accent-foreground",
            className
          )}
          data-state={checked ? "checked" : "unchecked"}
          onClick={() => onCheckedChange?.(!checked)}
        >
          {checked && (
            <LuCheck className="h-3 w-3 text-current absolute top-0.5 left-0.5" />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox }; 