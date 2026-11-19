import type { Papel } from "./tipos";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export class ErroApi extends Error {
  status: number;
  dados: Record<string, unknown>;
  constructor(status: number, mensagem: string, dados: Record<string, unknown> = {}) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

const chaveToken = (papel: Papel) => `flowdock:token:${papel}`;

export const tokens = {
  ler: (papel: Papel) => (typeof window === "undefined" ? null : localStorage.getItem(chaveToken(papel))),
  salvar: (papel: Papel, token: string) => localStorage.setItem(chaveToken(papel), token),
  apagar: (papel: Papel) => localStorage.removeItem(chaveToken(papel)),
};

export async function requisitar<T = unknown>(
  metodo: string,
  caminho: string,
  { token, corpo }: { token?: string | null; corpo?: unknown } = {},
): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(API_URL + caminho, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor.");
  }
  const tipo = resposta.headers.get("content-type") ?? "";
  const dados = tipo.includes("json") ? await resposta.json() : await resposta.text();
  if (!resposta.ok) {
    const d = typeof dados === "object" && dados ? (dados as Record<string, unknown>) : {};
    throw new ErroApi(resposta.status, String(d.erro ?? "Erro inesperado."), d);
  }
  return dados as T;
}

/** Baixa um documento fiscal (decifrado pelo servidor só para quem pode vê-lo, RNF04). */
export async function baixarDocumento(token: string | null, agendamentoId: string, documentoId: string): Promise<Blob> {
  let r: Response;
  try {
    r = await fetch(`${API_URL}/api/agendamentos/${agendamentoId}/documentos/${documentoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ErroApi(0, "Sem conexão: o documento só abre com internet.");
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    throw new ErroApi(r.status, String(d.erro ?? "Não foi possível abrir o documento."));
  }
  return r.blob();
}

/** Lê um arquivo e devolve o conteúdo em base64 (para o envio de DANFE, CT-e e MDF-e). */
export function arquivoParaBase64(arquivo: File): Promise<string> {
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(arquivo);
  });
}

/** Métricas de uso (PostHog). Só envia se NEXT_PUBLIC_POSTHOG_KEY estiver definida. */
export function registrarUso(evento: string, propriedades: Record<string, unknown> = {}) {
  const chave = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!chave || typeof window === "undefined") return;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  let id = localStorage.getItem("flowdock:anon");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("flowdock:anon", id);
  }
  fetch(`${host}/capture/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: chave, event: evento, distinct_id: id, properties: { ...propriedades, $current_url: location.href } }),
    keepalive: true,
  }).catch(() => {});
}
