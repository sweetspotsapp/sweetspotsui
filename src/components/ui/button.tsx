import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-base font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft hover:shadow-card hover:-translate-y-0.5 active:translate-y-0 active:shadow-soft",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:shadow-card hover:bg-destructive/90",
        outline:
          "border border-border bg-background/80 backdrop-blur-sm shadow-soft hover:bg-muted hover:border-primary/30 hover:-translate-y-0.5",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft hover:bg-secondary/80 hover:shadow-card hover:-translate-y-0.5",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Custom Sweetspots variants
        primary:
          "bg-primary text-primary-foreground shadow-card hover:shadow-elevated hover:-translate-y-0.5 active:translate-y-0 font-semibold",
        soft:
          "bg-card text-foreground border border-border/60 shadow-soft hover:bg-warm-sand/40 hover:border-primary/20 hover:-translate-y-0.5",
        save:
          "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full p-2 shadow-none",
        tag:
          "bg-secondary text-secondary-foreground text-sm px-4 py-1.5 rounded-full font-medium hover:bg-accent shadow-none",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 text-sm",
        lg: "h-14 px-8 text-lg",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
