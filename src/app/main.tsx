import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";

if ("fonts" in document) {
  void document.fonts.load('400 1em "Inter Variable"');
  void document.fonts.load('600 1em "Inter Variable"');
  void document.fonts.load('400 1em "JetBrains Mono Variable"');
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
