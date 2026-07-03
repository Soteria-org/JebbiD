import React from "react";
import { Header } from "@/components/layout/Header";

export function PageShell({ ctx, title, children }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
      <Header ctx={ctx} title={title} />
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</div>
    </div>
  );
}
