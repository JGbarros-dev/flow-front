# FlowDock · Frontend (flow-front)

Aplicativo web do MVP em Next.js 16, React 19 e Tailwind 4, gerado como site estático (`output: "export"`). Tem três entradas:

| Rota | Quem usa | O que faz |
| --- | --- | --- |
| `/motorista/` | Motorista no celular (**PWA instalável**) | Cadastro, agendamento, posição na fila, previsão de chamada, ETA, motivo das mudanças, aviso para seguir à doca, documentos, feedback e modo sem sinal |
| `/terminal/` | Operador do terminal no desktop | Indicadores, docas (início e fim do atendimento), fila virtual, mapa ao vivo, eventos, limite por janela e controle da simulação |
| `/transportadora/` | Despachante | Frota em operação com localização, agendamento em nome do motorista e cadastro de caminhões |

## Rodar localmente

```bash
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:4000
npm run dev                     # http://localhost:3000
```

Com a API rodando (`flow-back`, `npm run dev`), abra o terminal numa aba e o motorista em outra.

## Build e deploy

```bash
npm run build    # gera a pasta out/
npm start        # serve out/ na porta $PORT (padrão 3000)
```

`NEXT_PUBLIC_API_URL` é lida **no build**. Defina-a antes de buildar com a URL pública da API no Railway.

- **Railway:** novo serviço com Root Directory = `flow-front` e a variável `NEXT_PUBLIC_API_URL`. O Railway roda `npm run build` e `npm start`.
- **Vercel** (stack da Quest #6): importe o repositório com Root Directory = `flow-front` e defina `NEXT_PUBLIC_API_URL`. A Vercel reconhece a exportação estática.

Depois do deploy, coloque a URL do frontend em `CORS_ORIGIN` na API.

## PWA e modo offline (RNF06)

- `public/manifest.webmanifest` e os ícones em `public/icons/`: o app do motorista pode ser instalado na tela inicial ("Adicionar à tela inicial").
- `public/sw.js`: guarda o app em cache. Sem conexão, ele abre e mostra a última situação conhecida, salva no `localStorage`.
- As ações feitas sem sinal (feedback, documentos, marcar avisos como lidos) ficam numa fila e são enviadas quando a conexão volta.
- Para demonstrar: **Mais → Simular sem sinal**.
- Avisos do celular (RF13, RF20) usam a API de notificações do navegador. Ative em **Avisos → Ativar notificações**. Fora de `localhost`, exigem HTTPS, e Railway e Vercel já servem com HTTPS.

## Métricas de uso (PostHog)

Com `NEXT_PUBLIC_POSTHOG_KEY` definida, o app envia os eventos `agendamento_iniciado`, `agendamento_concluido` (com o tempo em segundos, para o RNF05), `agendamento_recusado` e `cadastro_motorista`. Sem a chave, nada é enviado.

## Acessibilidade (RNF11, RNF12)

O texto do app do motorista tem no mínimo 16 px, as combinações de cor seguem o contraste AA e o layout funciona a partir de 360 px de largura. O app nunca altera configurações do aparelho, como o brilho da tela (RNF09).
