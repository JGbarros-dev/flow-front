import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegistrarSW } from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: "FlowDock",
  description: "Fila virtual inteligente para o acesso de caminhões aos terminais de Suape (PE).",
  manifest: "/manifest.webmanifest",
  applicationName: "FlowDock",
  appleWebApp: { capable: true, title: "FlowDock", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <RegistrarSW />
        {children}
      </body>
    </html>
  );
}
