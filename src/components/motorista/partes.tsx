"use client";

import { useEffect, useState, type FormEvent } from "react";
import { arquivoParaBase64, baixarDocumento, tokens, type ErroApi } from "@/lib/api";
import { ETAPAS, ORIGENS, PORTES, dataBr, duracao, hora, minutosEntre, rotuloDia } from "@/lib/formato";
import type { Agendamento, Caminhao, Documento, Estado, Papel } from "@/lib/tipos";
import { Alerta, Botao, Campo, Cartao, Entrada, Selecao, Selo, SeloEstado, cx } from "../ui";

export type Acao = <R = unknown>(metodo: string, caminho: string, corpo?: unknown, offline?: string) => Promise<R | { enfileirado: true }>;

/** RN05: linha do tempo dos estados do veículo. */
export function LinhaDoTempo({ estado }: { estado: Estado }) {
  const atual = ETAPAS.findIndex((e) => e.estado === estado);
  return (
    <ol className="grid grid-cols-7 gap-1" aria-label="Etapas do atendimento">
      {ETAPAS.map((e, i) => (
        <li key={e.estado} className="flex flex-col items-center text-center" aria-current={i === atual ? "step" : undefined}>
          <span
            className={cx(
              "h-2 w-full rounded-full",
              i < atual ? "bg-blue-600" : i === atual ? "bg-blue-600 pulso" : "bg-slate-200",
            )}
          />
          <span className={cx("mt-1 hidden text-[11px] leading-tight sm:block", i === atual ? "font-bold text-blue-800" : "text-slate-500")}>{e.rotulo}</span>
        </li>
      ))}
    </ol>
  );
}

function Metrica({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={cx("rounded-xl p-3", destaque ? "bg-blue-700 text-white" : "bg-slate-50 ring-1 ring-inset ring-slate-200")}>
      <p className={cx("text-sm font-semibold", destaque ? "text-blue-100" : "text-slate-600")}>{rotulo}</p>
      <p className="tabular text-3xl font-extrabold leading-tight">{valor}</p>
      {detalhe && <p className={cx("text-sm", destaque ? "text-blue-100" : "text-slate-600")}>{detalhe}</p>}
    </div>
  );
}

const TIPOS_DOC = [
  { tipo: "DANFE", rotulo: "DANFE" },
  { tipo: "CTE", rotulo: "CT-e" },
  { tipo: "MDFE", rotulo: "MDF-e" },
] as const;

/** Mostra o documento dentro do app (funciona também no PWA instalado, sem abrir outra aba). */
export function VisualizadorDocumento({ agendamentoId, doc, papel = "motorista", fechar }: { agendamentoId: string; doc: Documento; papel?: Papel; fechar: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let criado: string | null = null;
    let ativo = true;
    baixarDocumento(tokens.ler(papel), agendamentoId, doc.id)
      .then(async (blob) => {
        if (!ativo) return;
        if (/xml|text|json/.test(blob.type) || /\.(xml|txt)$/i.test(doc.nome)) setTexto(await blob.text());
        criado = URL.createObjectURL(blob);
        setUrl(criado);
      })
      .catch((e: ErroApi) => {
        if (ativo) setErro(e.message);
      });
    return () => {
      ativo = false;
      if (criado) URL.revokeObjectURL(criado);
    };
  }, [agendamentoId, doc.id, doc.nome, papel]);

  const ehImagem = /^image\//.test(doc.mime) || /\.(png|jpe?g|webp|gif)$/i.test(doc.nome);
  const ehPdf = doc.mime === "application/pdf" || /\.pdf$/i.test(doc.nome);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center" role="dialog" aria-modal="true" aria-label={`${doc.rotulo}: ${doc.nome}`} onClick={fechar}>
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-t-2xl bg-white sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <p className="font-bold">{doc.rotulo}</p>
            <p className="truncate text-sm text-slate-600">
              {doc.nome} · {Math.max(1, Math.ceil(doc.tamanho / 1024))} KB · enviado {hora(doc.enviadoEm)}
            </p>
          </div>
          <Botao variante="secundario" tamanho="sm" onClick={fechar}>
            Fechar
          </Botao>
        </header>
        <div className="min-h-40 flex-1 overflow-auto bg-slate-50 p-3">
          {erro ? (
            <Alerta tipo="erro">{erro}</Alerta>
          ) : !url ? (
            <p className="p-6 text-center text-slate-600">Abrindo documento…</p>
          ) : ehImagem ? (
            // eslint-disable-next-line @next/next/no-img-element -- arquivo local (blob), sem otimização
            <img src={url} alt={`${doc.rotulo} enviado`} className="mx-auto max-h-[70dvh] rounded-lg" />
          ) : texto !== null ? (
            <pre className="whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-sm ring-1 ring-inset ring-slate-200">{texto}</pre>
          ) : ehPdf ? (
            <object data={url} type="application/pdf" className="h-[65dvh] w-full rounded-lg">
              <p className="p-6 text-center text-slate-700">Este aparelho não mostra PDF aqui. Use o botão Baixar arquivo.</p>
            </object>
          ) : (
            <p className="p-6 text-center text-slate-700">Pré-visualização indisponível para este tipo de arquivo. Use o botão Baixar arquivo.</p>
          )}
        </div>
        {url && (
          <footer className="border-t border-slate-200 p-3">
            <a href={url} download={doc.nome} className="flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 font-semibold text-white hover:bg-blue-800">
              Baixar arquivo
            </a>
          </footer>
        )}
      </div>
    </div>
  );
}

/** Botões para ver os documentos enviados; usado no histórico. */
export function ListaDocumentos({ ag, papel = "motorista" }: { ag: Agendamento; papel?: Papel }) {
  const [aberto, setAberto] = useState<Documento | null>(null);
  if (!ag.documentos.length) return null;
  return (
    <>
      <ul className="flex flex-wrap gap-1.5">
        {ag.documentos.map((d) => (
          <li key={d.id}>
            <button onClick={() => setAberto(d)} className="rounded-lg bg-white px-2.5 py-1 text-sm font-semibold text-blue-800 ring-1 ring-inset ring-blue-200 hover:bg-blue-50">
              Ver {d.rotulo}
            </button>
          </li>
        ))}
      </ul>
      {aberto && <VisualizadorDocumento agendamentoId={ag.id} doc={aberto} papel={papel} fechar={() => setAberto(null)} />}
    </>
  );
}

/** RF05: envio dos documentos fiscais antes da chegada; o motorista pode ver o que enviou. */
export function Documentos({ ag, acao, editavel }: { ag: Agendamento; acao: Acao; editavel: boolean }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState<Documento | null>(null);

  async function enviar(tipo: string, arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setEnviando(tipo);
    try {
      const conteudoBase64 = await arquivoParaBase64(arquivo);
      await acao("POST", `/api/agendamentos/${ag.id}/documentos`, { tipo, nome: arquivo.name, mime: arquivo.type, conteudoBase64 }, `Enviar ${tipo} de ${ag.codigo}`);
    } catch (e) {
      setErro((e as ErroApi).message);
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="space-y-2">
      {TIPOS_DOC.map(({ tipo, rotulo }) => {
        const doc = ag.documentos.find((d) => d.tipo === tipo);
        return (
          <div key={tipo} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <div className="min-w-0">
              <p className="font-semibold">{rotulo}</p>
              <p className="truncate text-sm text-slate-600">{doc ? `${doc.nome} · enviado ${hora(doc.enviadoEm)}` : "Ainda não enviado"}</p>
            </div>
            {doc && (
              <button onClick={() => setAberto(doc)} className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100">
                Ver
              </button>
            )}
            {!doc && !editavel && <Selo>Não enviado</Selo>}
            {editavel && (
              <label className={cx("cursor-pointer rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset", enviando === tipo ? "opacity-50" : "bg-white text-blue-800 ring-blue-200 hover:bg-blue-50")}>
                {enviando === tipo ? "Enviando…" : doc ? "Trocar" : "Enviar"}
                <input type="file" accept=".pdf,.xml,image/*" className="sr-only" disabled={!!enviando} onChange={(e) => enviar(tipo, e.target.files?.[0])} />
              </label>
            )}
          </div>
        );
      })}
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      <p className="text-sm text-slate-600">
        Os documentos ficam criptografados: só você{ag.transportadora ? ", a sua transportadora" : ""} e o terminal de destino podem abrir (LGPD).
      </p>
      {aberto && <VisualizadorDocumento agendamentoId={ag.id} doc={aberto} fechar={() => setAberto(null)} />}
    </div>
  );
}

/** Cartão principal da viagem: estado, posição na fila, previsão, motivo e ações. */
export function CartaoViagem({ ag, hoje, nomeTerminal, acao }: { ag: Agendamento; hoje: string; nomeTerminal: string; acao: Acao }) {
  const [origem, setOrigem] = useState(ag.origem);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verHistorico, setVerHistorico] = useState(false);

  async function executar(nome: string, metodo: string, caminho: string, corpo?: unknown, offline?: string) {
    setErro(null);
    setAviso(null);
    setOcupado(nome);
    try {
      const r = await acao(metodo, caminho, corpo, offline);
      if (r && typeof r === "object" && "enfileirado" in r) setAviso("Sem sinal: a ação será enviada assim que a conexão voltar.");
    } catch (e) {
      setErro((e as ErroApi).message);
    } finally {
      setOcupado(null);
    }
  }

  const naFila = ag.fila && ["AGENDADO", "EM_ROTA", "EM_APROXIMACAO", "AGUARDANDO"].includes(ag.estado);
  const emMovimento = ag.estado === "EM_ROTA" || ag.estado === "EM_APROXIMACAO";
  const antesDaChegada = ["AGENDADO", "EM_ROTA", "EM_APROXIMACAO"].includes(ag.estado);
  const progresso = ag.rota.totalKm ? Math.min(100, (ag.rota.percorridoKm / ag.rota.totalKm) * 100) : 0;

  return (
    <Cartao className="space-y-4">
      {ag.estado === "AUTORIZADO" && (
        <div className="-mx-4 -mt-4 rounded-t-2xl bg-emerald-600 p-5 text-white">
          <p className="text-lg font-semibold">Pode seguir agora!</p>
          <p className="text-4xl font-black">Doca {ag.doca}</p>
          <p className="mt-1 text-emerald-50">Autorizado às {hora(ag.horarios.chamada)} · {nomeTerminal}</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-600">
            {ag.codigo} · {rotuloDia(ag.data, hoje)}, janela das {ag.janelaRotulo}
          </p>
          <h2 className="text-xl font-extrabold">{nomeTerminal}</h2>
          <p className="text-slate-700">
            {ag.carga.produto} · {ag.caminhao.placa}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ag.carga.perigosa && <Selo cor="amber">⚠ Carga perigosa</Selo>}
            {ag.transportadora && <Selo>{ag.transportadora}</Selo>}
          </div>
        </div>
        <SeloEstado estado={ag.estado} />
      </div>

      {ag.estado !== "CANCELADO" && <LinhaDoTempo estado={ag.estado} />}

      {naFila && ag.fila && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Metrica rotulo="Sua posição na fila" valor={`${ag.fila.posicao}º`} detalhe={`de ${ag.fila.total} caminhões`} destaque />
            <Metrica rotulo="Previsão de chamada" valor={hora(ag.fila.previsaoChamada)} detalhe={ag.fila.esperaPrevistaMin > 0 ? `espera de ${duracao(ag.fila.esperaPrevistaMin)} no pátio` : "sem espera prevista"} />
            {ag.estado === "AGUARDANDO" ? (
              <Metrica rotulo="Chegada registrada" valor={hora(ag.horarios.chegada)} detalhe="check-in automático" />
            ) : (
              <Metrica rotulo="Chegada prevista (ETA)" valor={emMovimento ? hora(ag.eta) : "--:--"} detalhe={emMovimento ? `atualizado ${hora(ag.etaAtualizadoEm)}` : "inicie a viagem"} />
            )}
            <Metrica rotulo="Distância" valor={ag.distanciaKm !== null ? `${ag.distanciaKm.toLocaleString("pt-BR")} km` : `${ag.rota.totalKm.toLocaleString("pt-BR")} km`} detalhe={ag.estado === "AGUARDANDO" ? "no pátio" : ag.origemNome} />
          </div>
          {ag.fila.noPrazo ? (
            <Alerta tipo="sucesso">Você está dentro da sua janela: tem prioridade sobre quem chegar atrasado.</Alerta>
          ) : (
            <Alerta tipo="aviso" titulo="Fora da janela">
              Sua chegada passa das {ag.janelaRotulo} + tolerância. Você continua na fila, depois de quem chegar no prazo.
            </Alerta>
          )}
        </>
      )}

      {ag.parado && (
        <Alerta tipo="erro" titulo="Caminhão parado (imprevisto simulado)">
          Parado até {hora(ag.parado.ate)}. O ETA e a fila já consideram o atraso.
        </Alerta>
      )}

      {emMovimento && (
        <div>
          <div className="flex justify-between text-sm text-slate-600">
            <span>{ag.origemNome}</span>
            <span>
              {ag.rota.percorridoKm.toLocaleString("pt-BR")} de {ag.rota.totalKm.toLocaleString("pt-BR")} km
            </span>
          </div>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-1 text-sm text-slate-600">O check-in é automático quando você entrar na área do terminal.</p>
        </div>
      )}

      {/* RF19: motivo da mudança de posição */}
      {ag.fila?.motivo && naFila && (
        <div className="rounded-xl bg-indigo-50 p-3 ring-1 ring-inset ring-indigo-200">
          <p className="font-bold text-indigo-950">Por que minha posição mudou?</p>
          <p className="text-indigo-950">{ag.fila.motivo}</p>
          {ag.historicoFila.length > 1 && (
            <button className="mt-1 text-sm font-semibold text-indigo-800 underline" onClick={() => setVerHistorico((v) => !v)}>
              {verHistorico ? "Esconder histórico" : `Ver as ${ag.historicoFila.length} mudanças`}
            </button>
          )}
          {verHistorico && (
            <ul className="mt-2 space-y-1.5 text-sm text-indigo-950">
              {ag.historicoFila.map((h, i) => (
                <li key={i}>
                  <span className="tabular font-semibold">
                    {hora(h.em)} · {h.de}º → {h.para}º:
                  </span>{" "}
                  {h.motivo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {ag.estado === "NO_TERMINAL" && <Alerta tipo="info" titulo={`Em atendimento na doca ${ag.doca}`}>Início às {hora(ag.horarios.inicio)}.</Alerta>}

      {ag.estado === "CONCLUIDO" && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <p>Chegada: <b>{hora(ag.horarios.chegada)}</b></p>
          <p>Chamada: <b>{hora(ag.horarios.chamada)}</b></p>
          <p>Início: <b>{hora(ag.horarios.inicio)}</b></p>
          <p>Fim: <b>{hora(ag.horarios.fim)}</b></p>
          {ag.horarios.chegada && ag.horarios.chamada && (
            <p className="col-span-2">Espera no pátio: <b>{duracao(minutosEntre(ag.horarios.chegada, ag.horarios.chamada))}</b></p>
          )}
        </div>
      )}

      {ag.estado === "AGENDADO" && ag.data === hoje && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
          <Campo rotulo="De onde você vai sair?" dica="Simulação: o app percorre a rota escolhida até Suape.">
            <Selecao value={origem} onChange={(e) => setOrigem(e.target.value)}>
              {ORIGENS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </Selecao>
          </Campo>
          <Botao tamanho="lg" className="w-full" carregando={ocupado === "iniciar"} onClick={() => executar("iniciar", "POST", `/api/agendamentos/${ag.id}/iniciar-viagem`, { origem })}>
            Iniciar viagem
          </Botao>
        </div>
      )}
      {ag.estado === "AGENDADO" && ag.data > hoje && <p className="text-slate-600">Viagem marcada para {dataBr(ag.data)}. O botão para iniciar aparece no dia.</p>}

      {(antesDaChegada || ag.documentos.length > 0) && ag.estado !== "CANCELADO" && (
        <details className="group rounded-xl ring-1 ring-inset ring-slate-200">
          <summary className="cursor-pointer list-none p-3 font-semibold">
            Documentos da carga ({ag.documentos.length}/3) <span className="text-slate-500 group-open:hidden">· tocar para abrir</span>
          </summary>
          <div className="px-3 pb-3">
            <Documentos ag={ag} acao={acao} editavel={antesDaChegada} />
          </div>
        </details>
      )}

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {aviso && <Alerta tipo="aviso">{aviso}</Alerta>}

      {(emMovimento || antesDaChegada) && (
        <div className="flex flex-wrap gap-2">
          {emMovimento && (
            <Botao variante="secundario" tamanho="sm" carregando={ocupado === "imprevisto"} onClick={() => executar("imprevisto", "POST", `/api/agendamentos/${ag.id}/imprevisto`, { minutos: 30 })}>
              Simular imprevisto (+30 min)
            </Botao>
          )}
          {antesDaChegada && (
            <Botao
              variante="perigo"
              tamanho="sm"
              carregando={ocupado === "cancelar"}
              onClick={() => {
                if (confirm(`Cancelar ${ag.codigo}? O horário será liberado para outro caminhão.`)) executar("cancelar", "POST", `/api/agendamentos/${ag.id}/cancelar`);
              }}
            >
              Cancelar agendamento
            </Botao>
          )}
        </div>
      )}
    </Cartao>
  );
}

/** Formulário de feedback de uma pergunta, depois do atendimento. */
export function Feedback({ ag, acao }: { ag: Agendamento; acao: Acao }) {
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [estado, setEstado] = useState<"ok" | "fila" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!nota) return;
    setErro(null);
    try {
      const r = await acao("POST", `/api/agendamentos/${ag.id}/feedback`, { nota, comentario }, `Feedback de ${ag.codigo}`);
      setEstado(r && typeof r === "object" && "enfileirado" in r ? "fila" : "ok");
    } catch (e) {
      setErro((e as ErroApi).message);
    }
  }

  if (estado) return <Alerta tipo="sucesso">{estado === "ok" ? "Obrigado! Sua resposta ajuda a melhorar a fila." : "Resposta guardada: será enviada quando a conexão voltar."}</Alerta>;

  return (
    <Cartao titulo="Como foi a espera hoje?">
      <form onSubmit={enviar} className="space-y-3">
        <p className="text-slate-700">{ag.codigo} · atendimento concluído às {hora(ag.horarios.fim)}</p>
        <div className="flex justify-between gap-1" role="radiogroup" aria-label="Nota de 1 a 5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={nota === n}
              aria-label={`Nota ${n}`}
              onClick={() => setNota(n)}
              className={cx("flex-1 rounded-xl py-3 text-2xl ring-1 ring-inset", nota && n <= nota ? "bg-amber-100 ring-amber-300" : "bg-white ring-slate-300")}
            >
              ★
            </button>
          ))}
        </div>
        <Entrada placeholder="Quer comentar algo? (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} />
        {erro && <Alerta tipo="erro">{erro}</Alerta>}
        <Botao type="submit" className="w-full" disabled={!nota}>
          Enviar resposta
        </Botao>
      </form>
    </Cartao>
  );
}

/** RF02: cadastro de caminhão (com as validades dos certificados de carga perigosa). */
export function FormCaminhao({ acao, aoSalvar }: { acao: Acao; aoSalvar?: () => void }) {
  const [f, setF] = useState({ placa: "", porte: "Carreta tanque", rntrc: "", rntrcValidade: "", civValidade: "", cippValidade: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const muda = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      await acao("POST", "/api/caminhoes", f);
      setF({ placa: "", porte: "Carreta tanque", rntrc: "", rntrcValidade: "", civValidade: "", cippValidade: "" });
      aoSalvar?.();
    } catch (e) {
      setErro((e as ErroApi).message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      <Campo rotulo="Placa">
        <Entrada value={f.placa} onChange={muda("placa")} placeholder="ABC1D23" autoCapitalize="characters" required />
      </Campo>
      <Campo rotulo="Porte">
        <Selecao value={f.porte} onChange={muda("porte")}>
          {PORTES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Selecao>
      </Campo>
      <Campo rotulo="RNTRC" dica="Registro do transportador na ANTT (8 ou 9 dígitos).">
        <Entrada value={f.rntrc} onChange={muda("rntrc")} inputMode="numeric" required />
      </Campo>
      <p className="font-semibold text-slate-800">Validades (obrigatórias para carga perigosa)</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Campo rotulo="RNTRC">
          <Entrada type="date" value={f.rntrcValidade} onChange={muda("rntrcValidade")} />
        </Campo>
        <Campo rotulo="CIV">
          <Entrada type="date" value={f.civValidade} onChange={muda("civValidade")} />
        </Campo>
        <Campo rotulo="CIPP">
          <Entrada type="date" value={f.cippValidade} onChange={muda("cippValidade")} />
        </Campo>
      </div>
      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      <Botao type="submit" className="w-full" carregando={carregando}>
        Salvar caminhão
      </Botao>
    </form>
  );
}

export function ResumoCaminhao({ c, data }: { c: Caminhao; data: string }) {
  const itens = [
    ["RNTRC", c.rntrcValidade],
    ["CIV", c.civValidade],
    ["CIPP", c.cippValidade],
  ] as const;
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <p className="font-bold">
        {c.placa} <span className="font-normal text-slate-600">· {c.porte}</span>
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {itens.map(([nome, val]) => (
          <Selo key={nome} cor={!val ? "slate" : val < data ? "rose" : "emerald"}>
            {nome} {val ? (val < data ? `vencido ${dataBr(val)}` : `até ${dataBr(val)}`) : "sem data"}
          </Selo>
        ))}
      </div>
    </div>
  );
}
