import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-base font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Back-compat: default maps to secondary for safer emphasis
        default: "bg-sf-surface-dark text-sf-text-primary hover:bg-sf-surface",
        // New design language
        primary: "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/20 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // Secondary can be solid dark or subtle outline depending on theme
        secondary: "bg-sf-surface-dark text-sf-text-primary border border-sf-border hover:bg-sf-surface",
        outline: "border border-sf-border bg-transparent text-sf-text-primary hover:bg-sf-surface-dark",
        // Tertiary/Ghost
        ghost: "bg-transparent text-sf-text-secondary hover:text-sf-text-primary hover:bg-sf-surface-dark/60",
        link: "text-sf-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-10 rounded-md px-3 text-sm",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
