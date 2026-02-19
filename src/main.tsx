import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "./app/providers";
import { App } from "./app/App";
import "./styles.css";

import { Buffer } from "buffer";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
