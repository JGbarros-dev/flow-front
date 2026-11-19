"use client";

import { COR_PONTO, ORIGENS, ROTULO_ESTADO } from "@/lib/formato";
import type { Agendamento, Terminal } from "@/lib/tipos";

// Mapa esquemático (sem serviço externo): região metropolitana do Recife até Suape.
const LIMITES = { latMin: -8.74, latMax: -8.0, lngMin: -35.66, lngMax: -34.8 };
const L = 640;
const A = 440;
const KM_POR_GRAU = 111;

const px = (lat: number, lng: number): [number, number] => [
  ((lng - LIMITES.lngMin) / (LIMITES.lngMax - LIMITES.lngMin)) * L,
  ((LIMITES.latMax - lat) / (LIMITES.latMax - LIMITES.latMin)) * A,
];

const ROTAS_FUNDO: Record<string, [number, number][]> = {
  recife: [[-8.0631, -34.8711], [-8.113, -34.905], [-8.165, -34.94], [-8.22, -34.98], [-8.285, -35.025], [-8.34, -35.015], [-8.37, -34.99], [-8.3953, -34.958]],
  vitoria: [[-8.118, -35.292], [-8.13, -35.15], [-8.15, -35.05], [-8.22, -34.98]],
  palmares: [[-8.683, -35.591], [-8.6, -35.4], [-8.5, -35.2], [-8.43, -35.08], [-8.405, -35.02], [-8.4, -34.99], [-8.3953, -34.958]],
  ipojuca: [[-8.399, -35.064], [-8.405, -35.02]],
  cabo: [[-8.287, -35.035], [-8.315, -35.03], [-8.34, -35.015]],
};

const CIDADES: { nome: string; lat: number; lng: number }[] = [
  { nome: "Recife", lat: -8.0631, lng: -34.8711 },
  { nome: "Vitória de S. Antão", lat: -8.118, lng: -35.292 },
  { nome: "Cabo de S. Agostinho", lat: -8.287, lng: -35.035 },
  { nome: "Ipojuca", lat: -8.399, lng: -35.064 },
  { nome: "Palmares", lat: -8.683, lng: -35.591 },
];

const caminho = (pts: [number, number][]) => pts.map(([la, ln], i) => `${i ? "L" : "M"}${px(la, ln).join(",")}`).join(" ");

export function Mapa({ agendamentos, terminal, destaque, className }: { agendamentos: Agendamento[]; terminal: Pick<Terminal, "lat" | "lng" | "raioCheckinKm" | "raioAproximacaoKm" | "nome">; destaque?: string; className?: string }) {
  const [tx, ty] = px(terminal.lat, terminal.lng);
  const escalaKm = A / ((LIMITES.latMax - LIMITES.latMin) * KM_POR_GRAU);
  const visiveis = agendamentos.filter((a) => a.posicao && ["EM_ROTA", "EM_APROXIMACAO", "AGUARDANDO", "AUTORIZADO", "NO_TERMINAL"].includes(a.estado));
  const mar = `M${px(-8.0, -34.86).join(",")} L${px(-8.2, -34.93).join(",")} L${px(-8.36, -34.96).join(",")} L${px(-8.5, -35.0).join(",")} L${px(-8.74, -35.08).join(",")} L${L},${A} L${L},0 Z`;

  return (
    <svg viewBox={`0 0 ${L} ${A}`} className={className} role="img" aria-label={`Mapa esquemático com ${visiveis.length} caminhões a caminho ou no ${terminal.nome}`}>
      <rect width={L} height={A} fill="#f1f5f9" />
      <path d={mar} fill="#dbeafe" />
      <text x={L - 70} y={60} className="fill-blue-300" fontSize="14" fontStyle="italic">
        Oceano Atlântico
      </text>
      {Object.entries(ROTAS_FUNDO).map(([id, pts]) => (
        <path key={id} d={caminho(pts)} fill="none" stroke="#cbd5e1" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {CIDADES.map((c) => {
        const [x, y] = px(c.lat, c.lng);
        return (
          <g key={c.nome}>
            <circle cx={x} cy={y} r={3.5} fill="#64748b" />
            <text x={x + 6} y={y - 6} fontSize="12" className="fill-slate-500">
              {c.nome}
            </text>
          </g>
        );
      })}
      <circle cx={tx} cy={ty} r={terminal.raioAproximacaoKm * escalaKm} fill="#6366f1" fillOpacity={0.06} stroke="#6366f1" strokeOpacity={0.35} strokeDasharray="4 4" />
      <circle cx={tx} cy={ty} r={terminal.raioCheckinKm * escalaKm} fill="#f59e0b" fillOpacity={0.25} stroke="#d97706" />
      <rect x={tx - 7} y={ty - 7} width={14} height={14} rx={3} fill="#1d4ed8" />
      <text x={tx - 12} y={ty + 26} fontSize="12" fontWeight={700} className="fill-blue-800" textAnchor="end">
        {terminal.nome}
      </text>
      {visiveis.map((a) => {
        const ehDestaque = a.id === destaque;
        const rota = a.rota.pontos;
        const [x, y] = px(a.posicao!.lat, a.posicao!.lng);
        return (
          <g key={a.id}>
            {ehDestaque && rota.length > 0 && <path d={caminho(rota)} fill="none" stroke="#1d4ed8" strokeWidth={3} strokeOpacity={0.5} strokeDasharray="6 5" />}
            <circle cx={x} cy={y} r={ehDestaque ? 9 : 6.5} fill={COR_PONTO[a.estado]} stroke="#fff" strokeWidth={2}>
              <title>{`${a.caminhao.placa} · ${ROTULO_ESTADO[a.estado]}${a.parado ? " · parado (imprevisto)" : ""}`}</title>
            </circle>
            {a.parado && <circle cx={x} cy={y} r={13} fill="none" stroke="#e11d48" strokeWidth={2} className="pulso" />}
            {(ehDestaque || !["AGUARDANDO", "AUTORIZADO", "NO_TERMINAL"].includes(a.estado)) && (
              <text x={x + 10} y={y + 4} fontSize={ehDestaque ? 13 : 11} fontWeight={700} className={ehDestaque ? "fill-blue-900" : "fill-slate-700"}>
                {a.caminhao.placa}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const NOMES_ORIGEM = Object.fromEntries(ORIGENS.map((o) => [o.id, o.nome]));
