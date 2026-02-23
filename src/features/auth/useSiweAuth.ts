import { useContext } from "react";
import { AuthContext } from "./AuthProvider"; // 아래처럼 export 해줘야 함

export function useSiweAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useSiweAuth must be used within <AuthProvider />");
  }
  return ctx;
}
