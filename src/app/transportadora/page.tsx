import type { Metadata } from "next";
import { TransportadoraApp } from "@/components/transportadora/TransportadoraApp";

export const metadata: Metadata = { title: "FlowDock · Transportadora" };

export default function Page() {
  return <TransportadoraApp />;
}
