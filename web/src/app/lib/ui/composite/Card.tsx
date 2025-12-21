import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-md border border-border-light overflow-hidden",
  {
    variants: {
      tone: {
        default: "bg-white shadow-sm",
        elevated: "bg-white shadow-lg",
        surface: "bg-background-surface shadow-sm",
      },
    },
    defaultVariants: {
      tone: "default",
    },
  },
);

// classNameのみ除外、他のHTML属性（onClick、aria-*等）は継承
type CardProps = Omit<ComponentPropsWithoutRef<"div">, "className"> &
  VariantProps<typeof cardVariants>;

const CardRoot = forwardRef<HTMLDivElement, CardProps>(
  ({ tone, children, ...props }, ref) => (
    <div ref={ref} className={cardVariants({ tone })} {...props}>
      {children}
    </div>
  ),
);
CardRoot.displayName = "Card";

type CardHeaderProps = Omit<ComponentPropsWithoutRef<"div">, "className">;
const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} className="border-b border-border-light px-6 py-4" {...props}>
      {children}
    </div>
  ),
);
CardHeader.displayName = "Card.Header";

type CardBodyProps = Omit<ComponentPropsWithoutRef<"div">, "className">;
const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} className="px-6 py-4" {...props}>
      {children}
    </div>
  ),
);
CardBody.displayName = "Card.Body";

type CardFooterProps = Omit<ComponentPropsWithoutRef<"div">, "className">;
const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, ...props }, ref) => (
    <div ref={ref} className="border-t border-border-light px-6 py-4" {...props}>
      {children}
    </div>
  ),
);
CardFooter.displayName = "Card.Footer";

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
