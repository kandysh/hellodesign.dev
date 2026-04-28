import * as React from "react"
import { cn } from "@/lib/utils"

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    // biome-ignore lint/a11y/noLabelWithoutControl: wrapper component — htmlFor passed by consumer
    <label
      ref={ref}
      className={cn("label text-sm font-medium", className)}
      {...props}
    />
  ),
)
Label.displayName = "Label"

export { Label }
