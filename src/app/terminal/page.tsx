import type { Metadata } from "next";
import { TerminalApp } from "@/components/terminal/TerminalApp";

export const metadata: Metadata = { title: "FlowDock · Painel do terminal" };

export default function Page() {
  return <TerminalApp />;
}
