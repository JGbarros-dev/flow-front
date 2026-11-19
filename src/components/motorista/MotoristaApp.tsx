"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { arquivoParaBase64, registrarUso, requisitar, type ErroApi } from "@/lib/api";
import { ORIGENS, PRODUTOS, ativo, dataBr, diaPorExtenso, hora, rotuloDia, validadeStatus } from "@/lib/formato";
import type { Agendamento, EstadoMotorista, Janela, Notificacao } from "@/lib/tipos";
import { useConexao } from "@/lib/useConexao";
import { Login } from "../Login";
import { notificarSistema } from "../RegistrarSW";
import { Alerta, Botao, Campo, Cartao, Entrada, Logo, Selecao, Selo, Vazio, cx } from "../ui";
import { CartaoViagem, Feedback, FormCaminhao, ListaDocumentos, ResumoCaminhao, type Acao } from "./partes";

type Aba = "inicio" | "agendar" | "avisos" | "mais";

export function MotoristaApp() {
  const c = useConexao<EstadoMotorista>("motorista");
  const [aba, setAba] = useState<Aba>("inicio");
  const [criandoConta, setCriandoConta] = useState(false);
  const [toast, setToast] = useState<Notificacao | null>(null);
  const ultimaVista = useRef<number | null>(null);

  // Avisos novos: mostra no app e como notificação do celular (RF13, RF20).
  useEffect(() => {
    const ns = c.estado?.notificacoes;
    if (!ns) return;
    const maior = ns[0]?.id ?? 0;
    if (ultimaVista.current === null) {
      ultimaVista.current = Number(localStorage.getItem("flowdock:ultimoAviso") ?? maior);
    }
    const novas = ns.filter((n) => n.id > (ultimaVista.current ?? 0));
    if (!novas.length) return;
    ultimaVista.current = maior;
    localStorage.setItem("flowdock:ultimoAviso", String(maior));
    const principal = novas.find((n) => n.tipo === "autorizacao") ?? novas[0];
    setToast(principal);
    notificarSistema(principal.titulo, principal.texto, `fd-${principal.id}`);
    if (principal.tipo === "autorizacao") navigator.vibrate?.([300, 120, 300, 120, 600]);
  }, [c.estado?.notificacoes]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.tipo === "autorizacao" ? 15000 : 7000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!c.pronto) return <Carregando />;
  if (!c.token) {
    return (
      <div className="app-motorista flex min-h-dvh flex-col">
        {criandoConta ? (
          <Cadastro
            aoEntrar={(t) => {
              c.entrar(t);
              setCriandoConta(false);
            }}
            voltar={() => setCriandoConta(false)}
          />
        ) : (
          <Login
            papel="motorista"
            titulo="Entrar como motorista"
            subtitulo="Agende seu horário, acompanhe a fila e seja avisado quando puder seguir para a doca."
            aoEntrar={c.entrar}
            rodape={
              <Botao variante="fantasma" className="mt-4" onClick={() => setCriandoConta(true)}>
                Primeira vez? Criar conta
              </Botao>
            }
          />
        )}
      </div>
    );
  }
  if (!c.estado) return <Carregando texto={c.conectado ? "Carregando…" : "Conectando ao FlowDock…"} />;

  const e = c.estado;
  const naoLidas = e.notificacoes.filter((n) => !n.lida).length;
  const acao = c.acao as Acao;

  return (
    <div className="app-motorista mx-auto flex min-h-dvh w-full max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-blue-800 px-4 py-3 text-white shadow">
        <Logo claro className="text-lg" />
        <div className="text-right leading-tight">
          <p className="tabular text-lg font-bold">{hora(e.relogio.agora)}</p>
          <p className="flex items-center justify-end gap-1.5 text-sm text-blue-100">
            <span className={cx("size-2 rounded-full", c.conectado ? "bg-emerald-400" : "bg-rose-400")} aria-hidden />
            {c.conectado ? "Ao vivo" : "Sem conexão"}
          </p>
        </div>
      </header>

      {!c.conectado && (
        <div className="bg-amber-100 px-4 py-2 text-amber-950" role="status">
          <b>Sem sinal.</b> Mostrando a última situação conhecida{c.atualizadoEm ? ` (recebida às ${new Date(c.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})` : ""}.
          {c.pendentes.length > 0 && ` ${c.pendentes.length} ação(ões) aguardando conexão.`}
        </div>
      )}

      {toast && (
        <button
          onClick={() => {
            setToast(null);
            setAba(toast.tipo === "autorizacao" || toast.tipo === "fila" ? "inicio" : "avisos");
          }}
          className={cx(
            "fixed inset-x-3 top-16 z-30 mx-auto max-w-md rounded-2xl p-4 text-left shadow-xl ring-1",
            toast.tipo === "autorizacao" ? "bg-emerald-600 text-white ring-emerald-700" : "bg-white text-slate-900 ring-slate-200",
          )}
        >
          <p className="font-bold">{toast.titulo}</p>
          <p className={toast.tipo === "autorizacao" ? "text-emerald-50" : "text-slate-700"}>{toast.texto}</p>
        </button>
      )}

      <main className="flex-1 space-y-4 p-4 pb-28">
        {aba === "inicio" && <Inicio e={e} acao={acao} irAgendar={() => setAba("agendar")} irMais={() => setAba("mais")} />}
        {aba === "agendar" && <Agendar e={e} acao={acao} concluir={() => setAba("inicio")} />}
        {aba === "avisos" && <Avisos e={e} acao={acao} />}
        {aba === "mais" && <Mais e={e} acao={acao} sair={c.sair} semSinal={c.semSinal} definirSemSinal={c.definirSemSinal} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-4 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]" aria-label="Navegação">
        {(
          [
            ["inicio", "Início", "M3 11l9-7 9 7v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"],
            ["agendar", "Agendar", "M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm7 7v5m-2.5-2.5h5"],
            ["avisos", "Avisos", "M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0"],
            ["mais", "Mais", "M4 6h16M4 12h16M4 18h16"],
          ] as [Aba, string, string][]
        ).map(([id, rotulo, d]) => (
          <button key={id} onClick={() => setAba(id)} aria-current={aba === id ? "page" : undefined} className={cx("relative flex flex-col items-center gap-0.5 py-2.5 text-sm font-semibold", aba === id ? "text-blue-700" : "text-slate-600")}>
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={d} />
            </svg>
            {rotulo}
            {id === "avisos" && naoLidas > 0 && <span className="absolute right-[28%] top-1.5 rounded-full bg-rose-600 px-1.5 text-xs font-bold text-white">{naoLidas}</span>}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="app-motorista flex min-h-dvh flex-col items-center justify-center gap-3 text-slate-600">
      <Logo className="text-2xl" />
      <p>{texto}</p>
    </div>
  );
}

// ------------------------------------------------------------------ início
function Inicio({ e, acao, irAgendar, irMais }: { e: EstadoMotorista; acao: Acao; irAgendar: () => void; irMais: () => void }) {
  const terminal = (id: string) => e.terminais.find((t) => t.id === id)?.nome ?? "Terminal";
  // RF21: só agendamentos ativos ou futuros na tela de próxima viagem.
  const proximas = e.agendamentos.filter((a) => ativo(a.estado) && a.data >= e.hoje);
  const emAndamento = proximas.find((a) => a.estado !== "AGENDADO");
  const principal = emAndamento ?? proximas[0];
  const outras = proximas.filter((a) => a !== principal);
  const semFeedback = e.agendamentos.filter((a) => a.estado === "CONCLUIDO" && !a.feedback && a.data === e.hoje);

  return (
    <>
      <div>
        <p className="text-slate-600">{diaPorExtenso(e.relogio.agora)}</p>
        <h1 className="text-2xl font-extrabold">Olá, {e.perfil.nome.split(" ")[0]}</h1>
      </div>

      {e.caminhoes.length === 0 && (
        <Alerta tipo="aviso" titulo="Cadastre seu caminhão">
          Para agendar, cadastre a placa, o porte e o RNTRC.{" "}
          <button className="font-semibold underline" onClick={irMais}>
            Cadastrar agora
          </button>
        </Alerta>
      )}

      {semFeedback.map((a) => (
        <Feedback key={a.id} ag={a} acao={acao} />
      ))}

      {principal ? (
        <CartaoViagem ag={principal} hoje={e.hoje} nomeTerminal={terminal(principal.terminalId)} acao={acao} />
      ) : (
        <Cartao>
          <Vazio>Nenhuma viagem agendada.</Vazio>
          <Botao tamanho="lg" className="mt-3 w-full" onClick={irAgendar}>
            Agendar horário
          </Botao>
        </Cartao>
      )}

      {outras.length > 0 && (
        <Cartao titulo="Próximas viagens">
          <ul className="divide-y divide-slate-100">
            {outras.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-semibold">
                    {rotuloDia(a.data, e.hoje)} · {a.janelaRotulo}
                  </p>
                  <p className="text-sm text-slate-600">
                    {a.codigo} · {a.carga.produto} · {a.caminhao.placa}
                  </p>
                </div>
                {a.fila && <Selo cor="blue">{a.fila.posicao}º na fila</Selo>}
              </li>
            ))}
          </ul>
        </Cartao>
      )}
    </>
  );
}

// ------------------------------------------------------------------ agendar (RF03 a RF07)
function Agendar({ e, acao, concluir }: { e: EstadoMotorista; acao: Acao; concluir: () => void }) {
  const terminal = e.terminais[0];
  const amanha = useMemo(() => new Date(Date.parse(`${e.hoje}T12:00:00-03:00`) + 86_400_000).toISOString().slice(0, 10), [e.hoje]);
  const [caminhaoId, setCaminhaoId] = useState(e.caminhoes[0]?.id ?? "");
  const [produto, setProduto] = useState(PRODUTOS[0].nome);
  const [perigosa, setPerigosa] = useState(PRODUTOS[0].perigosa);
  const [data, setData] = useState(e.hoje);
  const [janelas, setJanelas] = useState<Janela[] | null>(null);
  const [janela, setJanela] = useState<number | null>(null);
  const [origem, setOrigem] = useState("recife");
  const [arquivos, setArquivos] = useState<Record<string, File | undefined>>({});
  const [erro, setErro] = useState<{ texto: string; documento?: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [criado, setCriado] = useState<Agendamento | null>(null);
  const inicio = useRef(0);

  useEffect(() => {
    inicio.current = Date.now();
    registrarUso("agendamento_iniciado");
  }, []);

  const carregarJanelas = useCallback(async () => {
    if (!terminal) return;
    try {
      const r = await acao<Janela[]>("GET", `/api/terminais/${terminal.id}/janelas?data=${data}`);
      if (Array.isArray(r)) setJanelas(r);
    } catch {
      setJanelas([]);
    }
  }, [acao, data, terminal]);

  useEffect(() => {
    carregarJanelas(); // eslint-disable-line react-hooks/set-state-in-effect -- busca a lista do servidor
    const t = setInterval(carregarJanelas, 15000);
    return () => clearInterval(t);
  }, [carregarJanelas]);

  const cam = e.caminhoes.find((x) => x.id === caminhaoId);
  const certificados = cam
    ? [
        { nome: "MOPP", validade: e.perfil.moppValidade },
        { nome: "CIV", validade: cam.civValidade },
        { nome: "CIPP", validade: cam.cippValidade },
        { nome: "RNTRC", validade: cam.rntrcValidade },
      ]
    : [];

  async function confirmar(ev: FormEvent) {
    ev.preventDefault();
    if (!janela || !cam) return;
    setErro(null);
    setEnviando(true);
    try {
      const documentos = [];
      for (const [tipo, f] of Object.entries(arquivos)) {
        if (f) documentos.push({ tipo, nome: f.name, mime: f.type, conteudoBase64: await arquivoParaBase64(f) });
      }
      const r = await acao<Agendamento>("POST", "/api/agendamentos", { terminalId: terminal.id, janela, caminhaoId, carga: { produto, perigosa }, origem, documentos });
      if (r && typeof r === "object" && "codigo" in r) {
        setCriado(r);
        registrarUso("agendamento_concluido", { segundos: Math.round((Date.now() - inicio.current) / 1000), perigosa });
      }
    } catch (e) {
      const err = e as ErroApi;
      setErro({ texto: err.message, documento: err.dados?.documento as string | undefined });
      registrarUso("agendamento_recusado", { status: err.status, documento: err.dados?.documento });
      carregarJanelas();
    } finally {
      setEnviando(false);
    }
  }

  if (!terminal) return <Vazio>Nenhum terminal disponível.</Vazio>;
  if (criado) {
    return (
      <Cartao className="space-y-3">
        <div className="text-center">
          <p className="text-5xl" aria-hidden>
            ✓
          </p>
          <h1 className="text-2xl font-extrabold">Agendamento confirmado</h1>
          <p className="text-slate-700">
            {criado.codigo} · {terminal.nome}
          </p>
          <p className="mt-2 text-3xl font-black text-blue-800">
            {rotuloDia(criado.data, e.hoje)}, {criado.janelaRotulo}
          </p>
          <p className="text-slate-600">
            {criado.carga.produto} · {criado.caminhao.placa} · {criado.documentos.length}/3 documentos
          </p>
        </div>
        <Alerta tipo="info">Você será avisado quando chegar sua vez. Não precisa chegar antes para garantir a posição.</Alerta>
        <Botao tamanho="lg" className="w-full" onClick={concluir}>
          Ver minha viagem
        </Botao>
      </Cartao>
    );
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      <h1 className="text-2xl font-extrabold">Agendar horário</h1>
      <p className="-mt-3 text-slate-600">{terminal.nome}</p>

      <Cartao titulo="1. Caminhão e carga">
        {e.caminhoes.length === 0 ? (
          <Alerta tipo="aviso">Cadastre um caminhão na aba Mais antes de agendar.</Alerta>
        ) : (
          <div className="space-y-3">
            <Campo rotulo="Caminhão">
              <Selecao value={caminhaoId} onChange={(ev) => setCaminhaoId(ev.target.value)}>
                {e.caminhoes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.placa} · {x.porte}
                  </option>
                ))}
              </Selecao>
            </Campo>
            <Campo rotulo="Carga">
              <Selecao
                value={produto}
                onChange={(ev) => {
                  setProduto(ev.target.value);
                  setPerigosa(PRODUTOS.find((p) => p.nome === ev.target.value)?.perigosa ?? false);
                }}
              >
                {PRODUTOS.map((p) => (
                  <option key={p.nome}>{p.nome}</option>
                ))}
              </Selecao>
            </Campo>
            <label className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
              <input type="checkbox" className="size-5 accent-amber-600" checked={perigosa} onChange={(ev) => setPerigosa(ev.target.checked)} />
              <span className="font-semibold text-amber-950">Carga perigosa (combustível, GLP…)</span>
            </label>
            {perigosa && (
              <div>
                <p className="mb-1 font-semibold">Certificados na data da operação ({dataBr(data)})</p>
                <ul className="grid grid-cols-2 gap-1.5">
                  {certificados.map((cert) => {
                    const st = validadeStatus(cert.validade, data);
                    return (
                      <li key={cert.nome} className={cx("rounded-lg px-2 py-1.5 text-sm", st.ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900")}>
                        <b>{cert.nome}</b> {st.texto}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </Cartao>

      <Cartao titulo="2. Dia e horário">
        <div className="mb-3 grid grid-cols-2 gap-2">
          {[e.hoje, amanha].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setData(d);
                setJanela(null);
                setJanelas(null);
              }}
              className={cx("rounded-xl py-2.5 font-semibold ring-1 ring-inset", data === d ? "bg-blue-700 text-white ring-blue-700" : "bg-white ring-slate-300")}
            >
              {rotuloDia(d, e.hoje)} · {dataBr(d).slice(0, 5)}
            </button>
          ))}
        </div>
        {!janelas ? (
          <p className="text-slate-600">Carregando horários…</p>
        ) : (
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Horários">
            {janelas
              .filter((j) => !j.encerrada)
              .map((j) => (
                <button
                  key={j.inicio}
                  type="button"
                  role="radio"
                  aria-checked={janela === j.inicio}
                  disabled={!j.disponivel}
                  onClick={() => setJanela(j.inicio)}
                  className={cx(
                    "rounded-xl px-1 py-2 text-center ring-1 ring-inset",
                    janela === j.inicio ? "bg-blue-700 text-white ring-blue-700" : j.disponivel ? "bg-white ring-slate-300 hover:bg-blue-50" : "bg-slate-100 text-slate-400 ring-slate-200",
                  )}
                >
                  <span className="tabular block text-lg font-bold">{j.rotulo}</span>
                  <span className="block text-xs">{j.disponivel ? `${j.vagas} vaga${j.vagas > 1 ? "s" : ""}` : "cheio"}</span>
                </button>
              ))}
          </div>
        )}
      </Cartao>

      <Cartao titulo="3. Documentos (opcional)">
        <p className="mb-2 text-slate-600">Envie agora para não ter conferência de papel na portaria. Dá para enviar depois também.</p>
        {(["DANFE", "CTE", "MDFE"] as const).map((tipo) => (
          <label key={tipo} className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <span>
              <b>{tipo === "CTE" ? "CT-e" : tipo === "MDFE" ? "MDF-e" : tipo}</b>
              <span className="block truncate text-sm text-slate-600">{arquivos[tipo]?.name ?? "Nenhum arquivo"}</span>
            </span>
            <span className="cursor-pointer rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-blue-800 ring-1 ring-inset ring-blue-200">Escolher</span>
            <input type="file" accept=".pdf,.xml,image/*" className="sr-only" onChange={(ev) => setArquivos({ ...arquivos, [tipo]: ev.target.files?.[0] })} />
          </label>
        ))}
        <Campo rotulo="De onde você vai sair?" dica="Usado na simulação da rota até Suape.">
          <Selecao value={origem} onChange={(ev) => setOrigem(ev.target.value)}>
            {ORIGENS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </Selecao>
        </Campo>
      </Cartao>

      {erro && (
        <Alerta tipo="erro" titulo={erro.documento ? `Agendamento bloqueado: ${erro.documento}` : "Não foi possível agendar"}>
          {erro.texto}
        </Alerta>
      )}

      <Botao type="submit" tamanho="lg" className="w-full" disabled={!janela || !cam} carregando={enviando}>
        {janela ? `Confirmar ${rotuloDia(data, e.hoje).toLowerCase()} às ${hora(janela)}` : "Escolha um horário"}
      </Botao>
    </form>
  );
}

// ------------------------------------------------------------------ avisos
function Avisos({ e, acao }: { e: EstadoMotorista; acao: Acao }) {
  const [permissao, setPermissao] = useState<string>("default");
  const naoLidas = e.notificacoes.some((n) => !n.lida);

  useEffect(() => {
    if ("Notification" in window) setPermissao(Notification.permission); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  useEffect(() => {
    if (naoLidas) acao("POST", "/api/notificacoes/lidas", undefined, "Marcar avisos como lidos").catch(() => {});
  }, [naoLidas, acao]);

  return (
    <>
      <h1 className="text-2xl font-extrabold">Avisos</h1>
      {permissao === "default" && (
        <Alerta tipo="info" titulo="Receba os avisos no celular">
          Assim você sabe que pode seguir para a doca sem ficar olhando a tela.
          <Botao tamanho="sm" className="mt-2" onClick={() => Notification.requestPermission().then(setPermissao)}>
            Ativar notificações
          </Botao>
        </Alerta>
      )}
      {e.notificacoes.length === 0 ? (
        <Vazio>Nenhum aviso ainda.</Vazio>
      ) : (
        <ul className="space-y-2">
          {e.notificacoes.map((n) => (
            <li key={n.id} className={cx("rounded-2xl p-3 ring-1", n.tipo === "autorizacao" ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-slate-200", !n.lida && "border-l-4 border-blue-600")}>
              <div className="flex justify-between gap-2">
                <p className="font-bold">{n.titulo}</p>
                <span className="tabular shrink-0 text-sm text-slate-500">{hora(n.em)}</span>
              </div>
              <p className="text-slate-700">{n.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ------------------------------------------------------------------ mais: perfil, caminhões, histórico
function Mais({ e, acao, sair, semSinal, definirSemSinal }: { e: EstadoMotorista; acao: Acao; sair: () => void; semSinal: boolean; definirSemSinal: (v: boolean) => void }) {
  const [novoCaminhao, setNovoCaminhao] = useState(e.caminhoes.length === 0);
  const [mopp, setMopp] = useState(e.perfil.moppValidade ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const historico = e.agendamentos.filter((a) => !ativo(a.estado) || a.data < e.hoje).reverse();

  return (
    <>
      <h1 className="text-2xl font-extrabold">Minha conta</h1>
      <Cartao titulo="Perfil">
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1">
          <dt className="text-slate-600">Nome</dt>
          <dd className="font-semibold">{e.perfil.nome}</dd>
          <dt className="text-slate-600">CPF</dt>
          <dd className="font-semibold">{e.perfil.cpf}</dd>
          <dt className="text-slate-600">CNH</dt>
          <dd className="font-semibold">{e.perfil.cnh}</dd>
          {e.perfil.transportadora && (
            <>
              <dt className="text-slate-600">Transportadora</dt>
              <dd className="font-semibold">{e.perfil.transportadora}</dd>
            </>
          )}
        </dl>
        <form
          className="mt-3 flex items-end gap-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            try {
              await acao("PATCH", "/api/me", { moppValidade: mopp || null });
              setMsg("Validade do MOPP atualizada.");
            } catch (er) {
              setMsg((er as ErroApi).message);
            }
          }}
        >
          <div className="flex-1">
            <Campo rotulo="Validade do MOPP">
              <Entrada type="date" value={mopp} onChange={(ev) => setMopp(ev.target.value)} />
            </Campo>
          </div>
          <Botao type="submit" variante="secundario">
            Salvar
          </Botao>
        </form>
        {msg && <p className="mt-2 text-sm text-slate-700">{msg}</p>}
      </Cartao>

      <Cartao titulo="Meus caminhões" acao={!novoCaminhao && <Botao variante="secundario" tamanho="sm" onClick={() => setNovoCaminhao(true)}>Adicionar</Botao>}>
        <div className="space-y-2">
          {e.caminhoes.map((c) => (
            <ResumoCaminhao key={c.id} c={c} data={e.hoje} />
          ))}
        </div>
        {novoCaminhao && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <FormCaminhao acao={acao} aoSalvar={() => setNovoCaminhao(false)} />
          </div>
        )}
      </Cartao>

      <Cartao titulo="Histórico">
        {historico.length === 0 ? (
          <Vazio>Os atendimentos concluídos e cancelados aparecem aqui.</Vazio>
        ) : (
          <ul className="divide-y divide-slate-100">
            {historico.map((a) => (
              <li key={a.id} className="py-2">
                <p className="font-semibold">
                  {a.codigo} · {dataBr(a.data)} {a.janelaRotulo}
                </p>
                <p className="text-sm text-slate-600">
                  {a.estado === "CANCELADO" ? "Cancelado" : `Concluído às ${hora(a.horarios.fim)}`} · {a.carga.produto}
                  {a.feedback ? ` · sua nota ${a.feedback.nota}/5` : ""}
                </p>
                <div className="mt-1.5">
                  <ListaDocumentos ag={a} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      <Cartao titulo="Demonstração">
        <label className="flex items-center justify-between gap-3">
          <span>
            <b>Simular sem sinal</b>
            <span className="block text-sm text-slate-600">O app mostra a última situação e guarda suas ações para enviar depois.</span>
          </span>
          <input type="checkbox" className="size-6 accent-blue-700" checked={semSinal} onChange={(ev) => definirSemSinal(ev.target.checked)} />
        </label>
      </Cartao>

      <Botao variante="perigo" className="w-full" onClick={sair}>
        Sair
      </Botao>
    </>
  );
}

// ------------------------------------------------------------------ cadastro (RF01)
function Cadastro({ aoEntrar, voltar }: { aoEntrar: (token: string) => void; voltar: () => void }) {
  const [f, setF] = useState({ nome: "", cpf: "", cnh: "", moppValidade: "", senha: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const muda = (k: keyof typeof f) => (ev: { target: { value: string } }) => setF({ ...f, [k]: ev.target.value });

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const r = await requisitar<{ token: string }>("POST", "/api/auth/cadastro", { corpo: { ...f, moppValidade: f.moppValidade || null } });
      registrarUso("cadastro_motorista");
      aoEntrar(r.token);
    } catch (e) {
      setErro((e as ErroApi).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 py-8">
      <Logo className="mb-5 text-2xl" />
      <h1 className="text-2xl font-extrabold">Criar conta de motorista</h1>
      <p className="mt-1 text-slate-600">Leva menos de 1 minuto.</p>
      <form onSubmit={enviar} className="mt-5 space-y-4">
        <Campo rotulo="Nome completo">
          <Entrada value={f.nome} onChange={muda("nome")} autoComplete="name" required />
        </Campo>
        <Campo rotulo="CPF">
          <Entrada value={f.cpf} onChange={muda("cpf")} inputMode="numeric" placeholder="000.000.000-00" required />
        </Campo>
        <Campo rotulo="Número da CNH" dica="Os 11 dígitos do registro.">
          <Entrada value={f.cnh} onChange={muda("cnh")} inputMode="numeric" required />
        </Campo>
        <Campo rotulo="Validade do MOPP (se tiver)" dica="Obrigatório para agendar carga perigosa.">
          <Entrada type="date" value={f.moppValidade} onChange={muda("moppValidade")} />
        </Campo>
        <Campo rotulo="Crie uma senha" dica="Pelo menos 4 caracteres.">
          <Entrada type="password" value={f.senha} onChange={muda("senha")} autoComplete="new-password" required />
        </Campo>
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Botao type="submit" tamanho="lg" className="w-full" carregando={carregando}>
          Criar conta
        </Botao>
        <Botao type="button" variante="fantasma" className="w-full" onClick={voltar}>
          Já tenho conta
        </Botao>
      </form>
    </div>
  );
}
