import type { PropsWithChildren } from "react";
import { TopNav } from "./TopNav";

export function Shell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
