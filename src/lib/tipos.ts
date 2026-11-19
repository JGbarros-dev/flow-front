export type Papel = "motorista" | "operador" | "transportadora";

export type Estado =
  | "AGENDADO"
  | "EM_ROTA"
  | "EM_APROXIMACAO"
  | "AGUARDANDO"
  | "AUTORIZADO"
  | "NO_TERMINAL"
  | "CONCLUIDO"
  | "CANCELADO";

export interface Terminal {
  id: string;
  nome: string;
  local: string;
  lat: number;
  lng: number;
  raioCheckinKm: number;
  raioAproximacaoKm: number;
  docas: number;
  janelaMin: number;
  duracaoAtendimentoMin: number;
  deslocamentoMin: number;
  toleranciaMin: number;
  limitePadrao: number;
  limites: Record<string, number>;
  abertura: string;
  fechamento: string;
  automatico: boolean;
}

export interface Fila {
  posicao: number;
  total: number;
  previsaoChamada: number;
  docaPrevista: number;
  etaFila: number;
  noPrazo: boolean;
  esperaPrevistaMin: number;
  motivo: string | null;
}

export interface MudancaFila {
  em: number;
  de: number;
  para: number;
  motivo: string;
  tipo: string;
}

export interface Documento {
  id: string;
  tipo: "DANFE" | "CTE" | "MDFE";
  rotulo: string;
  nome: string;
  mime: string;
  tamanho: number;
  enviadoEm: number;
}

export interface Agendamento {
  id: string;
  codigo: string;
  terminalId: string;
  data: string;
  janela: number;
  janelaRotulo: string;
  estado: Estado;
  carga: { produto: string; perigosa: boolean };
  origem: string;
  origemNome: string;
  motorista: { id: string; nome: string };
  caminhao: { id: string; placa: string; porte: string };
  transportadora: string | null;
  criadoPor: Papel;
  simulado: boolean;
  posicao: { lat: number; lng: number } | null;
  distanciaKm: number | null;
  eta: number | null;
  etaAtualizadoEm: number | null;
  doca: number | null;
  horarios: { criado: number; partida: number | null; chegada: number | null; chamada: number | null; inicio: number | null; fim: number | null };
  fila: Fila | null;
  historicoFila: MudancaFila[];
  rota: { pontos: [number, number][]; totalKm: number; percorridoKm: number; velocidadeKmh: number };
  parado: { ate: number } | null;
  documentos: Documento[];
  feedback: { nota: number; comentario: string; em: number } | null;
}

export interface Caminhao {
  id: string;
  placa: string;
  porte: string;
  rntrc: string;
  rntrcValidade: string | null;
  civValidade: string | null;
  cippValidade: string | null;
  motoristaId: string | null;
  transportadoraId: string | null;
}

export interface Notificacao {
  id: number;
  tipo: string;
  titulo: string;
  texto: string;
  agendamentoId?: string;
  em: number;
  lida: boolean;
}

export interface Evento {
  id: number;
  tipo: string;
  texto: string;
  em: number;
}

export interface Relogio {
  agora: number;
  velocidade: number;
  pausado: boolean;
}

interface Base {
  agora: number;
  hoje: string;
  relogio: Relogio;
}

export interface EstadoMotorista extends Base {
  perfil: { papel: "motorista"; id: string; nome: string; cpf: string; cnh: string; moppValidade: string | null; transportadora: string | null };
  terminais: Terminal[];
  caminhoes: Caminhao[];
  agendamentos: Agendamento[];
  notificacoes: Notificacao[];
}

export interface Metricas {
  agendados: number;
  aCaminho: number;
  aguardando: number;
  emAtendimento: number;
  concluidos: number;
  esperaMediaMin: number;
  ociosidadeMin: number;
  ocupacaoPct: number;
  notaMedia: number | null;
  respostasFeedback: number;
  projecao: { veiculos: number; esperaFlowDockMin: number; esperaEstaticaMin: number; fimFlowDock: number; fimEstatica: number } | null;
}

export interface EstadoOperador extends Base {
  perfil: { papel: "operador"; id: string; nome: string; email: string; terminalId: string };
  terminal: Terminal;
  agendamentos: Agendamento[];
  docas: { numero: number; agendamentoId: string | null }[];
  metricas: Metricas;
  eventos: Evento[];
}

export interface EstadoTransportadora extends Base {
  perfil: { papel: "transportadora"; id: string; nome: string; responsavel: string; email: string; cnpj: string };
  terminais: Terminal[];
  motoristas: { id: string; nome: string; cpf: string; moppValidade: string | null }[];
  caminhoes: Caminhao[];
  agendamentos: Agendamento[];
}

export interface Janela {
  inicio: number;
  rotulo: string;
  limite: number;
  ocupados: number;
  vagas: number;
  encerrada: boolean;
  disponivel: boolean;
}
