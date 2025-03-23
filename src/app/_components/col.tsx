import { forwardRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const Col = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string }
>(function Col({ children, className }, ref) {
  return (
    <div className={twMerge("flex flex-col", className)} ref={ref}>
      {children}
    </div>
  );
});

export default Col;