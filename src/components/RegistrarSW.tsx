"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA): app instalável e funcionando sem conexão (RNF06). */
export function RegistrarSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

/** Mostra uma notificação do sistema (Web Notifications), se o usuário permitiu. */
export async function notificarSistema(titulo: string, corpo: string, tag?: string) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const opcoes = { body: corpo, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag, data: { url: "/motorista/" } };
    if (reg) await reg.showNotification(titulo, opcoes);
    else new Notification(titulo, opcoes);
  } catch {
    /* navegador sem suporte: o aviso aparece só dentro do app */
  }
}
