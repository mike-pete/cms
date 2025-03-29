"use client";

import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

export function TanstackQueryDevtools() {
  if (process.env.NODE_ENV === "production") return null;

  return <ReactQueryDevtools initialIsOpen={false} />;
}
