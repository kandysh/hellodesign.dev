import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva("btn", {
  variants: {
    variant: {
      default: "btn-primary",
      destructive: "btn-error",
      outline: "btn-outline",
      secondary: "btn-secondary",
      ghost: "btn-ghost",
      link: "btn-link",
    },
    size: {
      default: "",
      sm: "btn-sm",
      lg: "btn-lg",
      icon: "btn-square btn-sm",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
