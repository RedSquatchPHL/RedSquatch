import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-[#0f0f0f] px-3 py-2 text-base text-[#d4a373] placeholder:text-[#888888] focus-visible:outline-none focus-visible:border-[#b87333] focus-visible:shadow-[0_2px_0_-1px_#b87333] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
