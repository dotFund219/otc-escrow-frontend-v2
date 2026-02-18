import { useEffect } from "react";

export function useOrdersSocket(onMessage: (data: any) => void) {
  useEffect(() => {
    const url = import.meta.env.VITE_WS_URL as string;
    if (!url) return;

    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data));
      } catch {
        // ignore
      }
    };
    return () => ws.close();
  }, [onMessage]);
}
