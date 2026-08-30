import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[transform,background-color,opacity] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-fg text-bg hover:bg-fg/90",
        gelo: "bg-gelo text-gelo-fg hover:bg-gelo/90",
        brasa: "bg-brasa text-brasa-fg hover:bg-brasa/90",
        ghost: "bg-transparent text-fg hover:bg-fg/8",
        outline:
          "border border-border bg-transparent text-fg hover:bg-fg/6",
      },
      size: {
        default: "h-12 px-5 text-sm rounded-md",
        lg: "h-14 px-6 text-base rounded-lg",
        xl: "h-16 w-full px-7 text-lg rounded-xl",
        icon: "size-12 rounded-md",
        chip: "h-10 px-4 text-sm rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
