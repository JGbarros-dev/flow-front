"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_URL, ErroApi, requisitar, tokens } from "./api";
import type { Papel } from "./tipos";

export interface AcaoPendente {
  id: string;
  metodo: string;
  caminho: string;
  corpo?: unknown;
  descricao: string;
  criadaEm: number;
}

const chaveCache = (p: Papel) => `flowdock:cache:${p}`;
const chaveFila = (p: Papel) => `flowdock:pendentes:${p}`;
const chaveSemSinal = (p: Papel) => `flowdock:semsinal:${p}`;

/**
 * Sessão + estado em tempo real de um perfil.
 * - Recebe a visão do perfil por SSE (Server-Sent Events) e reconecta sozinho.
 * - RNF06: guarda a última situação conhecida e mostra mesmo sem conexão;
 *   ações feitas sem sinal ficam na fila e são enviadas quando a conexão volta.
 */
export function useConexao<T>(papel: Papel) {
  const [pronto, setPronto] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [estado, setEstado] = useState<T | null>(null);
  const [conectado, setConectado] = useState(false);
  const [semSinal, setSemSinalState] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState<number | null>(null);
  const [pendentes, setPendentes] = useState<AcaoPendente[]>([]);
  const [tentativa, setTentativa] = useState(0);
  const enviando = useRef(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- leitura única do localStorage ao montar */
    setToken(tokens.ler(papel));
    try {
      const cache = JSON.parse(localStorage.getItem(chaveCache(papel)) ?? "null");
      if (cache) {
        setEstado(cache.estado);
        setAtualizadoEm(cache.em);
      }
      setPendentes(JSON.parse(localStorage.getItem(chaveFila(papel)) ?? "[]"));
      setSemSinalState(localStorage.getItem(chaveSemSinal(papel)) === "1");
    } catch {
      /* cache corrompido: ignora */
    }
    setPronto(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [papel]);

  const sair = useCallback(() => {
    tokens.apagar(papel);
    localStorage.removeItem(chaveCache(papel));
    localStorage.removeItem(chaveFila(papel));
    setToken(null);
    setEstado(null);
    setPendentes([]);
  }, [papel]);

  // Conexão SSE.
  useEffect(() => {
    if (!token || semSinal) {
      setConectado(false); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const es = new EventSource(`${API_URL}/api/stream?token=${encodeURIComponent(token)}`);
    let tempo: ReturnType<typeof setTimeout> | undefined;
    es.addEventListener("estado", (e) => {
      const dados = JSON.parse((e as MessageEvent).data) as T;
      const em = Date.now();
      setEstado(dados);
      setAtualizadoEm(em);
      setConectado(true);
      try {
        localStorage.setItem(chaveCache(papel), JSON.stringify({ estado: dados, em }));
      } catch {
        /* cota cheia: segue sem cache */
      }
    });
    es.onerror = () => {
      setConectado(false);
      if (es.readyState === EventSource.CLOSED) {
        requisitar("GET", "/api/me", { token })
          .then(() => {
            tempo = setTimeout(() => setTentativa((n) => n + 1), 3000);
          })
          .catch((e: ErroApi) => {
            if (e.status === 401) sair();
            else tempo = setTimeout(() => setTentativa((n) => n + 1), 3000);
          });
      }
    };
    return () => {
      clearTimeout(tempo);
      es.close();
    };
  }, [token, semSinal, papel, tentativa, sair]);

  const salvarFila = useCallback(
    (lista: AcaoPendente[]) => {
      setPendentes(lista);
      localStorage.setItem(chaveFila(papel), JSON.stringify(lista));
    },
    [papel],
  );

  // Envia as ações que ficaram na fila quando a conexão volta (RNF06).
  useEffect(() => {
    if (!conectado || semSinal || !token || !pendentes.length || enviando.current) return;
    enviando.current = true;
    (async () => {
      let restantes = [...pendentes];
      for (const a of pendentes) {
        try {
          await requisitar(a.metodo, a.caminho, { token, corpo: a.corpo });
          restantes = restantes.filter((x) => x.id !== a.id);
        } catch (e) {
          if ((e as ErroApi).status === 0) break;
          restantes = restantes.filter((x) => x.id !== a.id); // recusada pelo servidor: descarta
        }
      }
      salvarFila(restantes);
      enviando.current = false;
    })();
  }, [conectado, semSinal, token, pendentes, salvarFila]);

  const entrar = useCallback(
    (novo: string) => {
      tokens.salvar(papel, novo);
      setToken(novo);
    },
    [papel],
  );

  const definirSemSinal = useCallback(
    (v: boolean) => {
      localStorage.setItem(chaveSemSinal(papel), v ? "1" : "0");
      setSemSinalState(v);
    },
    [papel],
  );

  /** Chama a API; com `offline` a ação entra na fila quando não há sinal. */
  const acao = useCallback(
    async <R = unknown>(metodo: string, caminho: string, corpo?: unknown, offline?: string): Promise<R | { enfileirado: true }> => {
      const enfileirar = () => {
        salvarFila([...pendentes, { id: crypto.randomUUID(), metodo, caminho, corpo, descricao: offline!, criadaEm: Date.now() }]);
        return { enfileirado: true as const };
      };
      if (semSinal) {
        if (offline) return enfileirar();
        throw new ErroApi(0, "Sem sinal agora. Tente de novo quando a conexão voltar.");
      }
      try {
        return await requisitar<R>(metodo, caminho, { token, corpo });
      } catch (e) {
        const erro = e as ErroApi;
        if (erro.status === 0 && offline) return enfileirar();
        if (erro.status === 401) sair();
        throw erro;
      }
    },
    [semSinal, token, pendentes, salvarFila, sair],
  );

  return { pronto, token, estado, conectado, semSinal, atualizadoEm, pendentes, entrar, sair, acao, definirSemSinal };
}
