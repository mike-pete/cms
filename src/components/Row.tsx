import { forwardRef, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const Row = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
  }
>(function Row({ children, className }, ref) {
  return (
    <div className={twMerge("flex flex-row", className)} ref={ref}>
      {children}
    </div>
  );
});
export default Row;