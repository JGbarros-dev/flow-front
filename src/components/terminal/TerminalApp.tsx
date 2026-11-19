"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { API_URL, type ErroApi } from "@/lib/api";
import { dataBr, diaPorExtenso, duracao, hora, minutosEntre, rotuloDia } from "@/lib/formato";
import type { Agendamento, EstadoOperador, Janela } from "@/lib/tipos";
import { useConexao } from "@/lib/useConexao";
import { Login } from "../Login";
import { Mapa } from "../Mapa";
import { Alerta, Botao, Campo, Cartao, Entrada, Logo, Selo, SeloEstado, Vazio, cx } from "../ui";

type Acao = <R = unknown>(metodo: string, caminho: string, corpo?: unknown) => Promise<R | { enfileirado: true }>;
const NA_FILA = ["AGENDADO", "EM_ROTA", "EM_APROXIMACAO", "AGUARDANDO"];

export function TerminalApp() {
  const c = useConexao<EstadoOperador>("operador");
  const [aba, setAba] = useState<"operacao" | "config">("operacao");
  const [erro, setErro] = useState<string | null>(null);

  const acao: Acao = useCallback(
    async (metodo, caminho, corpo) => {
      setErro(null);
      try {
        return await c.acao(metodo, caminho, corpo);
      } catch (e) {
        setErro((e as ErroApi).message);
        throw e;
      }
    },
    [c],
  ) as Acao;

  if (!c.pronto) return null;
  if (!c.token) {
    return <Login papel="operador" titulo="Painel do terminal" subtitulo="Fila, docas e previsão de chegada de cada caminhão, em tempo real." aoEntrar={c.entrar} />;
  }
  if (!c.estado) return <p className="p-8 text-slate-600">Conectando ao FlowDock…</p>;
  const e = c.estado;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-blue-900 text-white shadow">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Logo claro className="text-xl" />
          <div className="leading-tight">
            <p className="font-bold">{e.terminal.nome}</p>
            <p className="text-sm text-blue-200">{e.perfil.nome} · coordenação de portaria e docas</p>
          </div>
          <nav className="flex gap-1 rounded-xl bg-blue-950/50 p-1">
            {(
              [
                ["operacao", "Operação"],
                ["config", "Docas e janelas"],
              ] as const
            ).map(([id, r]) => (
              <button key={id} onClick={() => setAba(id)} className={cx("rounded-lg px-3 py-1.5 font-semibold", aba === id ? "bg-white text-blue-900" : "text-blue-100 hover:bg-blue-800")}>
                {r}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Relogio e={e} acao={acao} conectado={c.conectado} />
            <button onClick={c.sair} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 hover:bg-white/10">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-4 p-5">
        {erro && (
          <Alerta tipo="erro">
            {erro}{" "}
            <button className="font-semibold underline" onClick={() => setErro(null)}>
              fechar
            </button>
          </Alerta>
        )}
        {aba === "operacao" ? <Operacao e={e} acao={acao} token={c.token} /> : <Configuracao e={e} acao={acao} />}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ relógio da simulação
function Relogio({ e, acao, conectado }: { e: EstadoOperador; acao: Acao; conectado: boolean }) {
  const sim = (corpo: unknown) => acao("PUT", "/api/simulacao", corpo).catch(() => {});
  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight">
        <p className="tabular text-2xl font-black">{hora(e.relogio.agora)}</p>
        <p className="flex items-center justify-end gap-1.5 text-xs text-blue-200">
          <span className={cx("size-2 rounded-full", conectado ? "bg-emerald-400" : "bg-rose-400")} />
          {conectado ? (e.relogio.pausado ? "pausado" : `simulação ${e.relogio.velocidade}x`) : "sem conexão"}
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-blue-950/50 p-1" aria-label="Controle da simulação">
        <button title={e.relogio.pausado ? "Continuar" : "Pausar"} onClick={() => sim({ pausado: !e.relogio.pausado })} className="rounded-lg px-2 py-1 font-bold hover:bg-blue-800">
          {e.relogio.pausado ? "▶" : "❚❚"}
        </button>
        {[1, 10, 30, 60].map((v) => (
          <button key={v} onClick={() => sim({ velocidade: v, pausado: false })} className={cx("tabular rounded-lg px-2 py-1 text-sm font-semibold", e.relogio.velocidade === v && !e.relogio.pausado ? "bg-white text-blue-900" : "hover:bg-blue-800")}>
            {v}x
          </button>
        ))}
        <button onClick={() => sim({ avancarMin: 15 })} className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-blue-800" title="Avançar 15 minutos">
          +15 min
        </button>
        <button
          onClick={() => {
            if (confirm("Reiniciar a simulação? Todos os dados voltam ao início do dia (07:40).")) acao("POST", "/api/simulacao/reiniciar").catch(() => {});
          }}
          className="rounded-lg px-2 py-1 text-sm font-semibold hover:bg-blue-800"
          title="Reiniciar a simulação"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ operação
function Kpi({ rotulo, valor, detalhe, cor = "text-slate-900" }: { rotulo: string; valor: string | number; detalhe?: string; cor?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-600">{rotulo}</p>
      <p className={cx("tabular text-3xl font-black", cor)}>{valor}</p>
      {detalhe && <p className="text-sm text-slate-500">{detalhe}</p>}
    </div>
  );
}

function Operacao({ e, acao, token }: { e: EstadoOperador; acao: Acao; token: string | null }) {
  const [selecionado, setSelecionado] = useState<string | undefined>();
  const hoje = e.agendamentos.filter((a) => a.data === e.hoje);
  const fila = hoje.filter((a) => NA_FILA.includes(a.estado) && a.fila).sort((a, b) => a.fila!.posicao - b.fila!.posicao);
  const concluidos = hoje.filter((a) => a.estado === "CONCLUIDO").sort((a, b) => (b.horarios.fim ?? 0) - (a.horarios.fim ?? 0));
  const futuros = e.agendamentos.filter((a) => a.data > e.hoje && a.estado !== "CANCELADO");
  const m = e.metricas;
  const p = m.projecao;
  const ganho = p && p.esperaEstaticaMin > 0 ? Math.round((1 - p.esperaFlowDockMin / p.esperaEstaticaMin) * 100) : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-extrabold first-letter:uppercase">{diaPorExtenso(e.relogio.agora)}</h1>
        <p className="text-slate-600">
          {e.terminal.docas} docas · janelas de {e.terminal.janelaMin} min · tolerância de {e.terminal.toleranciaMin} min · atendimento {e.terminal.automatico ? "automático (simulação)" : "manual"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi rotulo="A caminho" valor={m.aCaminho} detalhe={`${m.agendados} ainda não saíram`} cor="text-sky-700" />
        <Kpi rotulo="Aguardando no pátio" valor={m.aguardando} detalhe="fila virtual" cor="text-amber-600" />
        <Kpi rotulo="Nas docas" valor={m.emAtendimento} detalhe={`de ${e.terminal.docas} docas`} cor="text-blue-700" />
        <Kpi rotulo="Concluídos hoje" valor={m.concluidos} detalhe={m.notaMedia ? `nota média ${m.notaMedia.toLocaleString("pt-BR")} (${m.respostasFeedback})` : "sem avaliações ainda"} />
        <Kpi rotulo="Espera média no pátio" valor={duracao(m.esperaMediaMin)} detalhe="da chegada à chamada" />
        <Kpi rotulo="Doca ociosa" valor={duracao(m.ociosidadeMin)} detalhe={`ocupação de ${m.ocupacaoPct}%`} />
      </div>

      {p && p.veiculos > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl bg-blue-700 px-5 py-3 text-white">
          <p className="font-bold">Projeção dos {p.veiculos} caminhões que faltam</p>
          <p>
            FlowDock: espera média <b className="tabular text-xl">{duracao(p.esperaFlowDockMin)}</b>, último atendimento às <b>{hora(p.fimFlowDock)}</b>
          </p>
          <p className="text-blue-100">
            Agenda estática: {duracao(p.esperaEstaticaMin)}, fim às {hora(p.fimEstatica)}
          </p>
          {ganho !== null && ganho > 0 && <Selo cor="emerald">−{ganho}% de espera</Selo>}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Docas e={e} acao={acao} />
          <Cartao titulo={`Fila virtual (${fila.length})`} acao={<span className="text-sm text-slate-500">ordem por janela (RN06) e ETA, atualizada a cada minuto</span>}>
            {fila.length === 0 ? (
              <Vazio>Nenhum caminhão na fila agora.</Vazio>
            ) : (
              <div className="-mx-4 overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="border-y border-slate-200 bg-slate-50 text-sm text-slate-600">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-2 py-2">Veículo</th>
                      <th className="px-2 py-2">Carga</th>
                      <th className="px-2 py-2">Janela</th>
                      <th className="px-2 py-2">ETA / chegada</th>
                      <th className="px-2 py-2">Situação</th>
                      <th className="px-2 py-2">Previsão de chamada</th>
                      <th className="px-2 py-2">Docs</th>
                      <th className="px-4 py-2 text-right">Simular</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fila.map((a) => (
                      <LinhaFila key={a.id} a={a} agora={e.relogio.agora} acao={acao} token={token} selecionado={selecionado === a.id} selecionar={() => setSelecionado(a.id === selecionado ? undefined : a.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>

          <div className="grid gap-4 lg:grid-cols-2">
            <Cartao titulo={`Concluídos hoje (${concluidos.length})`}>
              {concluidos.length === 0 ? (
                <Vazio>Nenhum atendimento concluído ainda.</Vazio>
              ) : (
                <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                  {concluidos.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <b>{a.caminhao.placa}</b> · {a.codigo} · doca {a.doca}
                      </span>
                      <span className="tabular text-slate-600">
                        chegou {hora(a.horarios.chegada)} · esperou {duracao(minutosEntre(a.horarios.chegada!, a.horarios.chamada!))} · fim {hora(a.horarios.fim)}
                        {a.feedback && ` · ★${a.feedback.nota}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
            <Cartao titulo={`Próximos dias (${futuros.length})`}>
              {futuros.length === 0 ? (
                <Vazio>Nenhum agendamento para os próximos dias.</Vazio>
              ) : (
                <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {futuros.map((a) => (
                    <li key={a.id} className="py-2">
                      <b>{rotuloDia(a.data, e.hoje)} {a.janelaRotulo}</b> · {a.caminhao.placa} · {a.motorista.nome} · {a.carga.produto}
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
          </div>
        </div>

        <div className="space-y-4">
          <Cartao titulo="Mapa ao vivo" acao={<span className="text-sm text-slate-500">área laranja = check-in automático</span>}>
            <Mapa agendamentos={hoje} terminal={e.terminal} destaque={selecionado} className="w-full rounded-xl" />
            <Legenda />
          </Cartao>
          <Cartao titulo="O que está acontecendo">
            <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {e.eventos.map((ev) => (
                <li key={ev.id} className={cx("rounded-lg px-3 py-2 text-sm", COR_EVENTO[ev.tipo] ?? "bg-slate-50")}>
                  <span className="tabular mr-1 font-bold">{hora(ev.em)}</span>
                  {ev.texto}
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </div>
    </>
  );
}

const COR_EVENTO: Record<string, string> = {
  reordenacao: "bg-indigo-50 text-indigo-950 ring-1 ring-inset ring-indigo-200",
  bloqueio: "bg-rose-50 text-rose-950 ring-1 ring-inset ring-rose-200",
  imprevisto: "bg-rose-50 text-rose-950",
  autorizacao: "bg-emerald-50 text-emerald-950",
  checkin: "bg-amber-50 text-amber-950",
  agendamento: "bg-blue-50 text-blue-950",
};

function Legenda() {
  const itens = [
    ["#0284c7", "Em rota"],
    ["#4f46e5", "Em aproximação"],
    ["#d97706", "Aguardando"],
    ["#059669", "Autorizado"],
    ["#1d4ed8", "Na doca"],
  ];
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
      {itens.map(([cor, r]) => (
        <span key={r} className="inline-flex items-center gap-1">
          <span className="size-3 rounded-full" style={{ background: cor }} />
          {r}
        </span>
      ))}
      <span className="inline-flex items-center gap-1">
        <span className="size-3 rounded-full ring-2 ring-rose-500" />
        parado
      </span>
    </div>
  );
}

function LinhaFila({ a, agora, acao, token, selecionado, selecionar }: { a: Agendamento; agora: number; acao: Acao; token: string | null; selecionado: boolean; selecionar: () => void }) {
  const f = a.fila!;
  const ultima = a.historicoFila[0];
  const recente = ultima && agora - ultima.em < 15 * 60_000 && ultima.tipo !== "andou" ? ultima : null;
  return (
    <>
      <tr onClick={selecionar} className={cx("cursor-pointer align-top hover:bg-blue-50/50", selecionado && "bg-blue-50")}>
        <td className="px-4 py-2.5">
          <span className="tabular text-xl font-black">{f.posicao}</span>
          {recente && (
            <span className={cx("ml-1 text-sm font-bold", recente.para < recente.de ? "text-emerald-600" : "text-rose-600")} title={recente.motivo}>
              {recente.para < recente.de ? `↑${recente.de - recente.para}` : `↓${recente.para - recente.de}`}
            </span>
          )}
        </td>
        <td className="px-2 py-2.5">
          <p className="font-bold">{a.caminhao.placa}</p>
          <p className="text-sm text-slate-600">
            {a.codigo} · {a.motorista.nome}
          </p>
        </td>
        <td className="px-2 py-2.5 text-sm">
          {a.carga.produto}
          {a.carga.perigosa && (
            <span className="ml-1" title="Carga perigosa: MOPP, CIV, CIPP e RNTRC conferidos no agendamento">
              <Selo cor="amber">⚠ perigosa</Selo>
            </span>
          )}
        </td>
        <td className="tabular px-2 py-2.5 font-semibold">{a.janelaRotulo}</td>
        <td className="tabular px-2 py-2.5">
          {a.estado === "AGUARDANDO" ? (
            <>
              <b>{hora(a.horarios.chegada)}</b>
              <span className="block text-xs text-slate-500">check-in</span>
            </>
          ) : a.eta ? (
            <>
              <b>{hora(a.eta)}</b>
              <span className="block text-xs text-slate-500">{a.distanciaKm?.toLocaleString("pt-BR")} km</span>
            </>
          ) : (
            <span className="text-slate-500">não saiu</span>
          )}
        </td>
        <td className="px-2 py-2.5">
          <SeloEstado estado={a.estado} />
          <div className="mt-1 flex flex-wrap gap-1">
            {!f.noPrazo && <Selo cor="rose">fora da janela</Selo>}
            {a.parado && <Selo cor="rose">parado até {hora(a.parado.ate)}</Selo>}
          </div>
        </td>
        <td className="tabular px-2 py-2.5">
          <b>{hora(f.previsaoChamada)}</b>
          <span className="block text-xs text-slate-500">
            doca {f.docaPrevista}
            {f.esperaPrevistaMin > 0 ? ` · espera ${duracao(f.esperaPrevistaMin)}` : ""}
          </span>
        </td>
        <td className="px-2 py-2.5">
          <Selo cor={a.documentos.length === 3 ? "emerald" : a.documentos.length ? "amber" : "slate"}>{a.documentos.length}/3</Selo>
        </td>
        <td className="px-4 py-2.5 text-right" onClick={(ev) => ev.stopPropagation()}>
          {a.estado === "AGENDADO" && (
            <Botao tamanho="sm" variante="secundario" onClick={() => acao("POST", `/api/agendamentos/${a.id}/iniciar-viagem`).catch(() => {})}>
              Partir
            </Botao>
          )}
          {(a.estado === "EM_ROTA" || a.estado === "EM_APROXIMACAO") && (
            <Botao tamanho="sm" variante="perigo" onClick={() => acao("POST", `/api/agendamentos/${a.id}/imprevisto`, { minutos: 45 }).catch(() => {})}>
              Imprevisto +45
            </Botao>
          )}
        </td>
      </tr>
      {selecionado && (
        <tr className="bg-blue-50">
          <td colSpan={9} className="px-4 pb-3 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-semibold">Mudanças de posição (RF19)</p>
                {a.historicoFila.length === 0 ? (
                  <p className="text-slate-600">Nenhuma mudança até agora.</p>
                ) : (
                  <ul className="space-y-1">
                    {a.historicoFila.slice(0, 5).map((h, i) => (
                      <li key={i}>
                        <b className="tabular">
                          {hora(h.em)} {h.de}º→{h.para}º
                        </b>{" "}
                        {h.motivo}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="font-semibold">Documentos enviados antes da chegada</p>
                {a.documentos.length === 0 ? (
                  <p className="text-slate-600">Nenhum documento enviado.</p>
                ) : (
                  <ul className="space-y-1">
                    {a.documentos.map((d) => (
                      <li key={d.id}>
                        <button className="font-semibold text-blue-800 underline" onClick={() => abrirDocumento(a.id, d.id, token)}>
                          {d.rotulo}: {d.nome}
                        </button>{" "}
                        <span className="text-slate-500">({Math.ceil(d.tamanho / 1024)} KB)</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-1 text-slate-600">
                  Origem: {a.origemNome} · {a.caminhao.porte}
                  {a.transportadora ? ` · ${a.transportadora}` : " · autônomo"}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

async function abrirDocumento(agId: string, docId: string, token: string | null) {
  const janela = window.open("", "_blank");
  const r = await fetch(`${API_URL}/api/agendamentos/${agId}/documentos/${docId}`, { headers: { Authorization: `Bearer ${token}` } });
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  if (janela) janela.location.href = url;
}

/** RF17: docas, com início e fim do atendimento registrados pelo operador. */
function Docas({ e, acao }: { e: EstadoOperador; acao: Acao }) {
  const porId = new Map(e.agendamentos.map((a) => [a.id, a]));
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {e.docas.map((d) => {
        const a = d.agendamentoId ? porId.get(d.agendamentoId) : undefined;
        const duracaoMs = e.terminal.duracaoAtendimentoMin * 60_000;
        const progresso = a?.estado === "NO_TERMINAL" && a.horarios.inicio ? Math.min(100, ((e.relogio.agora - a.horarios.inicio) / duracaoMs) * 100) : 0;
        return (
          <div key={d.numero} className={cx("rounded-2xl p-4 ring-1", a ? (a.estado === "AUTORIZADO" ? "bg-emerald-50 ring-emerald-300" : "bg-blue-50 ring-blue-300") : "bg-white ring-slate-200")}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black">Doca {d.numero}</p>
              {a ? <SeloEstado estado={a.estado} /> : <Selo>Livre</Selo>}
            </div>
            {a ? (
              <div className="mt-2 space-y-2">
                <p>
                  <b className="text-lg">{a.caminhao.placa}</b> · {a.codigo}
                </p>
                <p className="text-sm text-slate-600">
                  {a.carga.produto} · chamado {hora(a.horarios.chamada)}
                  {a.horarios.inicio ? ` · início ${hora(a.horarios.inicio)}` : ""}
                </p>
                {a.estado === "NO_TERMINAL" && (
                  <div className="h-2 overflow-hidden rounded-full bg-blue-200">
                    <div className="h-full bg-blue-700 transition-all" style={{ width: `${progresso}%` }} />
                  </div>
                )}
                {a.estado === "AUTORIZADO" && (
                  <Botao tamanho="sm" className="w-full" onClick={() => acao("POST", `/api/agendamentos/${a.id}/inicio`).catch(() => {})}>
                    Registrar início
                  </Botao>
                )}
                {a.estado === "NO_TERMINAL" && (
                  <Botao tamanho="sm" variante="sucesso" className="w-full" onClick={() => acao("POST", `/api/agendamentos/${a.id}/fim`).catch(() => {})}>
                    Registrar fim
                  </Botao>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">O próximo caminhão da fila é chamado automaticamente.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ configuração (RF15)
function Configuracao({ e, acao }: { e: EstadoOperador; acao: Acao }) {
  const t = e.terminal;
  const [f, setF] = useState({ docas: t.docas, limitePadrao: t.limitePadrao, toleranciaMin: t.toleranciaMin, duracaoAtendimentoMin: t.duracaoAtendimentoMin, automatico: t.automatico });
  const [limites, setLimites] = useState<Record<string, string>>(Object.fromEntries(Object.entries(t.limites).map(([k, v]) => [k, String(v)])));
  const [data, setData] = useState(e.hoje);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const amanha = new Date(Date.parse(`${e.hoje}T12:00:00-03:00`) + 86_400_000).toISOString().slice(0, 10);

  const carregar = useCallback(() => {
    acao<Janela[]>("GET", `/api/terminais/${t.id}/janelas?data=${data}`)
      .then((r) => Array.isArray(r) && setJanelas(r))
      .catch(() => {});
  }, [acao, t.id, data]);

  useEffect(() => {
    carregar();
    const i = setInterval(carregar, 10000);
    return () => clearInterval(i);
  }, [carregar]);

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    setMsg(null);
    try {
      const lim = Object.fromEntries(Object.entries(limites).filter(([, v]) => v !== ""));
      await acao("PUT", "/api/terminal", { ...f, limites: lim });
      setMsg("Configuração salva. Os novos agendamentos já usam os valores atualizados.");
      carregar();
    } catch {
      /* erro mostrado no topo */
    }
  }

  const num = (k: "docas" | "limitePadrao" | "toleranciaMin" | "duracaoAtendimentoMin") => (ev: { target: { value: string } }) => setF({ ...f, [k]: Number(ev.target.value) });

  return (
    <form onSubmit={salvar} className="grid gap-4 lg:grid-cols-3">
      <Cartao titulo="Capacidade do terminal" className="space-y-4">
        <Campo rotulo="Número de docas">
          <Entrada type="number" min={1} max={20} value={f.docas} onChange={num("docas")} />
        </Campo>
        <Campo rotulo="Limite padrão de veículos por janela" dica={`Janelas de ${t.janelaMin} minutos (RN02).`}>
          <Entrada type="number" min={1} max={50} value={f.limitePadrao} onChange={num("limitePadrao")} />
        </Campo>
        <Campo rotulo="Tolerância de atraso (min)" dica="Depois dela o veículo perde a garantia do horário (RN03).">
          <Entrada type="number" min={0} max={120} value={f.toleranciaMin} onChange={num("toleranciaMin")} />
        </Campo>
        <Campo rotulo="Duração média do atendimento (min)">
          <Entrada type="number" min={5} max={240} value={f.duracaoAtendimentoMin} onChange={num("duracaoAtendimentoMin")} />
        </Campo>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="size-5 accent-blue-700" checked={f.automatico} onChange={(ev) => setF({ ...f, automatico: ev.target.checked })} />
          <span>
            <b>Atendimento automático (simulação)</b>
            <span className="block text-sm text-slate-600">Desligado: o início e o fim na doca são registrados pelo operador.</span>
          </span>
        </label>
        {msg && <Alerta tipo="sucesso">{msg}</Alerta>}
        <Botao type="submit" className="w-full">
          Salvar configuração
        </Botao>
      </Cartao>

      <Cartao
        titulo="Limite por janela"
        className="lg:col-span-2"
        acao={
          <div className="flex gap-1">
            {[e.hoje, amanha].map((d) => (
              <button key={d} type="button" onClick={() => setData(d)} className={cx("rounded-lg px-3 py-1 text-sm font-semibold ring-1 ring-inset", d === data ? "bg-blue-700 text-white ring-blue-700" : "ring-slate-300")}>
                {rotuloDia(d, e.hoje)} {dataBr(d).slice(0, 5)}
              </button>
            ))}
          </div>
        }
      >
        <p className="mb-3 text-slate-600">Deixe em branco para usar o limite padrão ({f.limitePadrao}). O limite vale para todos os dias.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {janelas.map((j) => {
            const cheia = j.ocupados >= j.limite;
            return (
              <div key={j.inicio} className={cx("rounded-xl p-3 ring-1 ring-inset", j.encerrada ? "bg-slate-50 ring-slate-200 opacity-60" : cheia ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200")}>
                <div className="flex items-center justify-between">
                  <b className="tabular text-lg">{j.rotulo}</b>
                  <span className="tabular text-sm text-slate-600">
                    {j.ocupados}/{j.limite}
                  </span>
                </div>
                <div className="my-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={cx("h-full", cheia ? "bg-amber-500" : "bg-blue-600")} style={{ width: `${Math.min(100, (j.ocupados / Math.max(1, j.limite)) * 100)}%` }} />
                </div>
                <input
                  type="number"
                  min={0}
                  max={50}
                  aria-label={`Limite da janela das ${j.rotulo}`}
                  placeholder={`padrão ${f.limitePadrao}`}
                  value={limites[j.rotulo] ?? ""}
                  onChange={(ev) => setLimites({ ...limites, [j.rotulo]: ev.target.value })}
                  className="w-full rounded-lg border-0 px-2 py-1 text-sm ring-1 ring-inset ring-slate-300"
                />
              </div>
            );
          })}
        </div>
      </Cartao>
    </form>
  );
}
