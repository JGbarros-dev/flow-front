"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { ErroApi } from "@/lib/api";
import { PRODUTOS, ORIGENS, ativo, dataBr, hora, rotuloDia, validadeStatus } from "@/lib/formato";
import type { Agendamento, EstadoTransportadora, Janela } from "@/lib/tipos";
import { useConexao } from "@/lib/useConexao";
import { Login } from "../Login";
import { Mapa } from "../Mapa";
import { FormCaminhao, ResumoCaminhao, type Acao } from "../motorista/partes";
import { Alerta, Botao, Campo, Cartao, Logo, Selecao, Selo, SeloEstado, Vazio, cx } from "../ui";

export function TransportadoraApp() {
  const c = useConexao<EstadoTransportadora>("transportadora");
  const [selecionado, setSelecionado] = useState<string | undefined>();

  if (!c.pronto) return null;
  if (!c.token) {
    return <Login papel="transportadora" titulo="Área da transportadora" subtitulo="Agende pelos seus motoristas e acompanhe a frota em operação." aoEntrar={c.entrar} />;
  }
  if (!c.estado) return <p className="p-8 text-slate-600">Conectando ao FlowDock…</p>;
  const e = c.estado;
  const acao = c.acao as Acao;
  const terminal = e.terminais[0];
  const emOperacao = e.agendamentos.filter((a) => ativo(a.estado));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
          <Logo claro className="text-xl" />
          <div className="leading-tight">
            <p className="font-bold">{e.perfil.nome}</p>
            <p className="text-sm text-slate-300">
              {e.perfil.responsavel} · CNPJ {e.perfil.cnpj}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <p className="text-right leading-tight">
              <span className="tabular block text-xl font-black">{hora(e.relogio.agora)}</span>
              <span className="flex items-center justify-end gap-1.5 text-xs text-slate-300">
                <span className={cx("size-2 rounded-full", c.conectado ? "bg-emerald-400" : "bg-rose-400")} />
                {c.conectado ? "ao vivo" : "sem conexão"}
              </span>
            </p>
            <button onClick={c.sair} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/40 hover:bg-white/10">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 p-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Cartao titulo={`Frota em operação (${emOperacao.length})`} acao={<span className="text-sm text-slate-500">situação e localização em tempo real</span>}>
            {emOperacao.length === 0 ? (
              <Vazio>Nenhum caminhão da frota em operação.</Vazio>
            ) : (
              <div className="-mx-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead className="border-y border-slate-200 bg-slate-50 text-sm text-slate-600">
                    <tr>
                      <th className="px-4 py-2">Veículo</th>
                      <th className="px-2 py-2">Agendamento</th>
                      <th className="px-2 py-2">Situação</th>
                      <th className="px-2 py-2">Onde está</th>
                      <th className="px-2 py-2">Fila</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {emOperacao.map((a) => (
                      <LinhaFrota key={a.id} a={a} hoje={e.hoje} acao={acao} selecionado={a.id === selecionado} selecionar={() => setSelecionado(a.id === selecionado ? undefined : a.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Cartao>
          {terminal && <AgendarParaMotorista e={e} acao={acao} />}
        </div>

        <div className="space-y-4">
          {terminal && (
            <Cartao titulo="Mapa da frota">
              <Mapa agendamentos={e.agendamentos.filter((a) => a.data === e.hoje)} terminal={terminal} destaque={selecionado} className="w-full rounded-xl" />
            </Cartao>
          )}
          <Cartao titulo="Motoristas">
            <ul className="space-y-2">
              {e.motoristas.map((m) => {
                const st = validadeStatus(m.moppValidade, e.hoje);
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span>
                      <b>{m.nome}</b>
                      <span className="block text-sm text-slate-500">{m.cpf}</span>
                    </span>
                    <Selo cor={st.ok ? "emerald" : "rose"}>MOPP {st.ok ? `até ${dataBr(m.moppValidade)}` : st.texto}</Selo>
                  </li>
                );
              })}
            </ul>
          </Cartao>
          <Frota e={e} acao={acao} />
        </div>
      </main>
    </div>
  );
}

function LinhaFrota({ a, hoje, acao, selecionado, selecionar }: { a: Agendamento; hoje: string; acao: Acao; selecionado: boolean; selecionar: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <tr onClick={selecionar} className={cx("cursor-pointer align-top hover:bg-slate-50", selecionado && "bg-blue-50")}>
      <td className="px-4 py-2.5">
        <b>{a.caminhao.placa}</b>
        <span className="block text-sm text-slate-600">{a.motorista.nome}</span>
      </td>
      <td className="px-2 py-2.5 text-sm">
        <b>
          {rotuloDia(a.data, hoje)} {a.janelaRotulo}
        </b>
        <span className="block text-slate-600">
          {a.codigo} · {a.carga.produto}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <SeloEstado estado={a.estado} />
        {a.parado && <Selo cor="rose" className="mt-1">parado</Selo>}
        {a.fila && !a.fila.noPrazo && <Selo cor="rose" className="mt-1">fora da janela</Selo>}
      </td>
      <td className="px-2 py-2.5 text-sm">
        {a.estado === "AGENDADO"
          ? "Ainda não saiu"
          : a.estado === "AGUARDANDO"
            ? `No pátio desde ${hora(a.horarios.chegada)}`
            : a.estado === "AUTORIZADO" || a.estado === "NO_TERMINAL"
              ? `Doca ${a.doca}`
              : `${a.distanciaKm?.toLocaleString("pt-BR")} km do terminal · ETA ${hora(a.eta)}`}
      </td>
      <td className="px-2 py-2.5 text-sm">{a.fila ? `${a.fila.posicao}º · chamada ${hora(a.fila.previsaoChamada)}` : "—"}</td>
      <td className="px-4 py-2.5 text-right" onClick={(ev) => ev.stopPropagation()}>
        {["AGENDADO", "EM_ROTA", "EM_APROXIMACAO"].includes(a.estado) && (
          <Botao
            tamanho="sm"
            variante="perigo"
            onClick={() => {
              if (confirm(`Cancelar ${a.codigo}?`)) acao("POST", `/api/agendamentos/${a.id}/cancelar`).catch((e: ErroApi) => setErro(e.message));
            }}
          >
            Cancelar
          </Botao>
        )}
        {erro && <p className="text-sm text-rose-700">{erro}</p>}
      </td>
    </tr>
  );
}

/** RF03 pela transportadora; o motorista recebe o aviso (RF20); bloqueio por certificado vencido (RF07). */
function AgendarParaMotorista({ e, acao }: { e: EstadoTransportadora; acao: Acao }) {
  const terminal = e.terminais[0];
  const amanha = new Date(Date.parse(`${e.hoje}T12:00:00-03:00`) + 86_400_000).toISOString().slice(0, 10);
  const [motoristaId, setMotoristaId] = useState(e.motoristas[0]?.id ?? "");
  const [caminhaoId, setCaminhaoId] = useState(e.caminhoes[0]?.id ?? "");
  const [produto, setProduto] = useState(PRODUTOS[0].nome);
  const [data, setData] = useState(e.hoje);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [janela, setJanela] = useState<number | null>(null);
  const [origem, setOrigem] = useState("recife");
  const [resultado, setResultado] = useState<{ tipo: "sucesso" | "erro"; titulo: string; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const perigosa = PRODUTOS.find((p) => p.nome === produto)?.perigosa ?? false;

  const carregar = useCallback(() => {
    acao<Janela[]>("GET", `/api/terminais/${terminal.id}/janelas?data=${data}`)
      .then((r) => Array.isArray(r) && setJanelas(r))
      .catch(() => {});
  }, [acao, terminal.id, data]);
  useEffect(() => {
    carregar();
    const i = setInterval(carregar, 15000);
    return () => clearInterval(i);
  }, [carregar]);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    if (!janela) return;
    setResultado(null);
    setEnviando(true);
    try {
      const r = (await acao("POST", "/api/agendamentos", { terminalId: terminal.id, janela, motoristaId, caminhaoId, carga: { produto, perigosa }, origem })) as Agendamento;
      setResultado({ tipo: "sucesso", titulo: `Agendamento ${r.codigo} criado`, texto: `${r.motorista.nome} foi avisado no app: ${rotuloDia(r.data, e.hoje)} às ${r.janelaRotulo}, ${r.caminhao.placa}.` });
      setJanela(null);
      carregar();
    } catch (er) {
      const err = er as ErroApi;
      setResultado({ tipo: "erro", titulo: err.dados?.documento ? `Bloqueado: ${err.dados.documento}` : "Não foi possível agendar", texto: err.message });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Cartao titulo="Agendar para um motorista da frota">
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Motorista">
            <Selecao value={motoristaId} onChange={(ev) => setMotoristaId(ev.target.value)}>
              {e.motoristas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Caminhão">
            <Selecao value={caminhaoId} onChange={(ev) => setCaminhaoId(ev.target.value)}>
              {e.caminhoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.placa} · {c.porte}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Carga" dica={perigosa ? "Carga perigosa: MOPP, CIV, CIPP e RNTRC são conferidos agora." : undefined}>
            <Selecao value={produto} onChange={(ev) => setProduto(ev.target.value)}>
              {PRODUTOS.map((p) => (
                <option key={p.nome}>{p.nome}</option>
              ))}
            </Selecao>
          </Campo>
          <Campo rotulo="Origem (simulação)">
            <Selecao value={origem} onChange={(ev) => setOrigem(ev.target.value)}>
              {ORIGENS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
        </div>
        <div className="flex gap-2">
          {[e.hoje, amanha].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setData(d);
                setJanela(null);
              }}
              className={cx("rounded-lg px-3 py-1.5 font-semibold ring-1 ring-inset", d === data ? "bg-blue-700 text-white ring-blue-700" : "ring-slate-300")}
            >
              {rotuloDia(d, e.hoje)} {dataBr(d).slice(0, 5)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {janelas
            .filter((j) => !j.encerrada)
            .map((j) => (
              <button
                key={j.inicio}
                type="button"
                disabled={!j.disponivel}
                onClick={() => setJanela(j.inicio)}
                className={cx("rounded-lg py-1.5 text-center ring-1 ring-inset", janela === j.inicio ? "bg-blue-700 text-white ring-blue-700" : j.disponivel ? "ring-slate-300 hover:bg-blue-50" : "bg-slate-100 text-slate-400 ring-slate-200")}
              >
                <span className="tabular block font-bold">{j.rotulo}</span>
                <span className="block text-xs">{j.disponivel ? `${j.vagas} vaga(s)` : "cheio"}</span>
              </button>
            ))}
        </div>
        {resultado && (
          <Alerta tipo={resultado.tipo} titulo={resultado.titulo}>
            {resultado.texto}
          </Alerta>
        )}
        <Botao type="submit" disabled={!janela} carregando={enviando}>
          {janela ? `Agendar às ${hora(janela)}` : "Escolha um horário"}
        </Botao>
      </form>
    </Cartao>
  );
}

function Frota({ e, acao }: { e: EstadoTransportadora; acao: Acao }) {
  const [novo, setNovo] = useState(false);
  return (
    <Cartao titulo="Caminhões" acao={!novo && <Botao tamanho="sm" variante="secundario" onClick={() => setNovo(true)}>Adicionar</Botao>}>
      <div className="space-y-2">
        {e.caminhoes.map((c) => (
          <ResumoCaminhao key={c.id} c={c} data={e.hoje} />
        ))}
      </div>
      {novo && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <FormCaminhao acao={acao} aoSalvar={() => setNovo(false)} />
        </div>
      )}
    </Cartao>
  );
}
