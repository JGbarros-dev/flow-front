import Link from "next/link";
import { Logo } from "@/components/ui";

const ENTRADAS = [
  {
    href: "/motorista/",
    titulo: "Motorista",
    perfil: "Carlos Mendes · celular (PWA)",
    texto: "Agendar horário, ver a posição na fila virtual e a previsão de chamada, e receber o aviso para seguir à doca.",
    cor: "bg-blue-700 text-white hover:bg-blue-800",
  },
  {
    href: "/terminal/",
    titulo: "Terminal",
    perfil: "Renata Albuquerque · painel desktop",
    texto: "Fila, situação e ETA de cada caminhão, docas, mapa ao vivo, configuração de janelas e controle da simulação.",
    cor: "bg-white text-slate-900 ring-1 ring-slate-200 hover:ring-blue-300",
  },
  {
    href: "/transportadora/",
    titulo: "Transportadora",
    perfil: "TransNordeste · despachante",
    texto: "Agendar em nome dos motoristas da frota e acompanhar a situação e a localização de cada caminhão.",
    cor: "bg-white text-slate-900 ring-1 ring-slate-200 hover:ring-blue-300",
  },
];

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12">
      <Logo className="text-3xl" />
      <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">A fila de caminhões vira uma fila virtual que se ajusta sozinha.</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        O FlowDock usa a localização e o ETA de cada caminhão para reorganizar a entrada nos terminais de Suape: quem atrasa perde a prioridade, quem chega no prazo avança, e o motorista só se desloca quando chega a vez dele.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {ENTRADAS.map((e) => (
          <Link key={e.href} href={e.href} className={`rounded-2xl p-6 shadow-sm transition ${e.cor}`}>
            <p className="text-2xl font-extrabold">{e.titulo}</p>
            <p className="mt-0.5 text-sm font-semibold opacity-80">{e.perfil}</p>
            <p className="mt-3 opacity-90">{e.texto}</p>
            <p className="mt-4 font-bold">Abrir →</p>
          </Link>
        ))}
      </div>
      <p className="mt-10 text-sm text-slate-500">
        MVP acadêmico · Empreendedorismo em TIC 2026.2 · dados, empresas e pessoas simulados. Para a demonstração, abra o Terminal numa aba e o Motorista em outra (ou no celular).
      </p>
    </main>
  );
}
