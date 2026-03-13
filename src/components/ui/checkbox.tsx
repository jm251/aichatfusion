"use client"

import { ComponentProps } from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import CheckIcon from "lucide-react/dist/esm/icons/check"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border-input bg-background data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border-2 shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 relative",
        "before:content-[''] before:absolute before:inset-0 before:rounded-[2px] before:border before:border-gray-300 dark:before:border-gray-600",
        "data-[state=checked]:before:bg-primary data-[state=checked]:before:border-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none relative z-10"
      >
        <CheckIcon className="size-3.5 text-current" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
