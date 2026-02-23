import { useContext } from "react";
import { AuthContext } from "./AuthProvider"; // make sure to export it like this

export function useSiweAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useSiweAuth must be used within <AuthProvider />");
  }
  return ctx;
}
