"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { COR_ESTADO, ROTULO_ESTADO } from "@/lib/formato";
import type { Estado } from "@/lib/tipos";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variante = "primario" | "secundario" | "perigo" | "sucesso" | "fantasma";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-blue-700 text-white hover:bg-blue-800 focus-visible:outline-blue-700",
  secundario: "bg-white text-blue-800 ring-1 ring-inset ring-blue-200 hover:bg-blue-50",
  perigo: "bg-white text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50",
  sucesso: "bg-emerald-600 text-white hover:bg-emerald-700",
  fantasma: "text-slate-700 hover:bg-slate-100",
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  className,
  carregando,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; tamanho?: "sm" | "md" | "lg"; carregando?: boolean }) {
  const tam = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-base", lg: "px-5 py-3.5 text-lg" }[tamanho];
  return (
    <button
      {...props}
      disabled={props.disabled || carregando}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTES[variante],
        tam,
        className,
      )}
    >
      {carregando && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Cartao({ children, className, titulo, acao }: { children: ReactNode; className?: string; titulo?: ReactNode; acao?: ReactNode }) {
  return (
    <section className={cx("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200", className)}>
      {(titulo || acao) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {titulo && <h2 className="font-bold text-slate-900">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}

export function SeloEstado({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset", COR_ESTADO[estado], className)}>
      {ROTULO_ESTADO[estado]}
    </span>
  );
}

export function Selo({ children, cor = "slate", className }: { children: ReactNode; cor?: "slate" | "amber" | "rose" | "emerald" | "blue"; className?: string }) {
  const cores = {
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-100 text-amber-900",
    rose: "bg-rose-100 text-rose-800",
    emerald: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
  };
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-sm font-semibold", cores[cor], className)}>{children}</span>;
}

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: string; erro?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-slate-800">{rotulo}</span>
      {children}
      {dica && !erro && <span className="mt-1 block text-sm text-slate-600">{dica}</span>}
      {erro && <span className="mt-1 block text-sm font-semibold text-rose-700">{erro}</span>}
    </label>
  );
}

const estiloEntrada =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600";

export function Entrada(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(estiloEntrada, props.className)} />;
}

export function Selecao(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(estiloEntrada, props.className)} />;
}

export function Alerta({ tipo = "info", titulo, children }: { tipo?: "info" | "erro" | "sucesso" | "aviso"; titulo?: string; children?: ReactNode }) {
  const cores = {
    info: "bg-blue-50 text-blue-900 ring-blue-200",
    erro: "bg-rose-50 text-rose-900 ring-rose-200",
    sucesso: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    aviso: "bg-amber-50 text-amber-950 ring-amber-200",
  };
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={cx("rounded-xl p-3 ring-1 ring-inset", cores[tipo])}>
      {titulo && <p className="font-bold">{titulo}</p>}
      {children && <div className={titulo ? "mt-0.5" : ""}>{children}</div>}
    </div>
  );
}

export function Logo({ className, claro }: { className?: string; claro?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-extrabold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill={claro ? "#fff" : "#1d4ed8"} />
        <path d="M7 20h13v-8H7zM20 20h5v-4l-2-3h-3z" fill={claro ? "#1d4ed8" : "#fff"} />
        <circle cx="11" cy="22" r="2" fill={claro ? "#1d4ed8" : "#fff"} />
        <circle cx="22" cy="22" r="2" fill={claro ? "#1d4ed8" : "#fff"} />
      </svg>
      <span>
        Flow<span className={claro ? "text-blue-200" : "text-blue-700"}>Dock</span>
      </span>
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-slate-50 p-4 text-center text-slate-600 ring-1 ring-inset ring-slate-200">{children}</p>;
}

export { cx };
