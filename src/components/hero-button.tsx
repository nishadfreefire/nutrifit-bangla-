import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const heroButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        hero: "bg-primary text-primary-foreground lift hover:bg-primary/90 hover:translate-y-[-1px]",
        coral: "bg-coral hover:opacity-90 hover:translate-y-[-1px]",
        ghostHero: "border border-border bg-card text-foreground hover:bg-secondary",
        outline: "border border-primary/30 bg-card text-primary hover:bg-primary/5",
      },
      size: {
        default: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base",
        sm: "h-9 px-4 text-xs",
      },
    },
    defaultVariants: { variant: "hero", size: "default" },
  },
);

export interface HeroButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof heroButtonVariants> {}

export const HeroButton = React.forwardRef<HTMLButtonElement, HeroButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(heroButtonVariants({ variant, size, className }))} {...props} />
  ),
);
HeroButton.displayName = "HeroButton";

export { Button, buttonVariants };
