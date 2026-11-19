import type { Metadata } from "next";
import { MotoristaApp } from "@/components/motorista/MotoristaApp";

export const metadata: Metadata = { title: "FlowDock · Motorista" };

export default function Page() {
  return <MotoristaApp />;
}
