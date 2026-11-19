import type { Estado } from "./tipos";

const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", hour: "2-digit", minute: "2-digit" });
const fmtData = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Recife", weekday: "long", day: "2-digit", month: "long" });

export const hora = (ms: number | null | undefined) => (ms ? fmtHora.format(ms) : "--:--");
export const dataCurta = (ms: number) => fmtData.format(ms);
export const diaPorExtenso = (ms: number) => fmtDia.format(ms);
export const dataBr = (iso: string | null | undefined) => (iso ? iso.split("-").reverse().join("/") : "—");

export const minutosEntre = (a: number, b: number) => Math.round((b - a) / 60_000);

export function duracao(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h${String(m % 60).padStart(2, "0")}`;
}

export function rotuloDia(data: string, hoje: string) {
  if (data === hoje) return "Hoje";
  const amanha = new Date(Date.parse(`${hoje}T12:00:00-03:00`) + 86_400_000).toISOString().slice(0, 10);
  if (data === amanha) return "Amanhã";
  return dataBr(data);
}

// RN05: os estados, nesta ordem.
export const ETAPAS: { estado: Estado; rotulo: string }[] = [
  { estado: "AGENDADO", rotulo: "Agendado" },
  { estado: "EM_ROTA", rotulo: "Em rota" },
  { estado: "EM_APROXIMACAO", rotulo: "Em aproximação" },
  { estado: "AGUARDANDO", rotulo: "Aguardando virtualmente" },
  { estado: "AUTORIZADO", rotulo: "Autorizado" },
  { estado: "NO_TERMINAL", rotulo: "No terminal" },
  { estado: "CONCLUIDO", rotulo: "Atendimento concluído" },
];

export const ROTULO_ESTADO: Record<Estado, string> = {
  AGENDADO: "Agendado",
  EM_ROTA: "Em rota",
  EM_APROXIMACAO: "Em aproximação",
  AGUARDANDO: "Aguardando virtualmente",
  AUTORIZADO: "Autorizado",
  NO_TERMINAL: "No terminal",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const COR_ESTADO: Record<Estado, string> = {
  AGENDADO: "bg-slate-100 text-slate-700 ring-slate-300",
  EM_ROTA: "bg-sky-50 text-sky-800 ring-sky-300",
  EM_APROXIMACAO: "bg-indigo-50 text-indigo-800 ring-indigo-300",
  AGUARDANDO: "bg-amber-50 text-amber-900 ring-amber-300",
  AUTORIZADO: "bg-emerald-50 text-emerald-800 ring-emerald-400",
  NO_TERMINAL: "bg-blue-600 text-white ring-blue-700",
  CONCLUIDO: "bg-slate-200 text-slate-600 ring-slate-300",
  CANCELADO: "bg-rose-50 text-rose-700 ring-rose-200",
};

/** Cor do ponto do caminhão no mapa. */
export const COR_PONTO: Record<Estado, string> = {
  AGENDADO: "#94a3b8",
  EM_ROTA: "#0284c7",
  EM_APROXIMACAO: "#4f46e5",
  AGUARDANDO: "#d97706",
  AUTORIZADO: "#059669",
  NO_TERMINAL: "#1d4ed8",
  CONCLUIDO: "#64748b",
  CANCELADO: "#e11d48",
};

export const ativo = (e: Estado) => e !== "CONCLUIDO" && e !== "CANCELADO";

export const PRODUTOS: { nome: string; perigosa: boolean }[] = [
  { nome: "Óleo diesel S10", perigosa: true },
  { nome: "Gasolina C", perigosa: true },
  { nome: "Etanol hidratado", perigosa: true },
  { nome: "GLP", perigosa: true },
  { nome: "Óleo combustível", perigosa: true },
  { nome: "Contêiner (carga geral)", perigosa: false },
  { nome: "Granel sólido", perigosa: false },
];

export const ORIGENS = [
  { id: "recife", nome: "Recife (zona portuária)" },
  { id: "cabo", nome: "Cabo de Santo Agostinho" },
  { id: "ipojuca", nome: "Ipojuca" },
  { id: "vitoria", nome: "Vitória de Santo Antão" },
  { id: "palmares", nome: "Palmares" },
];

export const PORTES = ["Toco", "Truck", "Carreta", "Carreta tanque", "Bitrem", "Rodotrem"];

export function validadeStatus(validade: string | null, data: string) {
  if (!validade) return { ok: false, texto: "não cadastrado" };
  if (validade < data) return { ok: false, texto: `vencido em ${dataBr(validade)}` };
  return { ok: true, texto: `válido até ${dataBr(validade)}` };
}
