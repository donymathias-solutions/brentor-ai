# Brentor.ai — Como ativar a IA real

## Passo 1: Instalar Node.js

1. Acesse **https://nodejs.org**
2. Baixe a versão **LTS** (recomendada — botão verde)
3. Instale seguindo as instruções (next, next, finish)
4. **Feche e reabra** o terminal (PowerShell ou cmd)
5. Verifique: `node --version` (deve mostrar v18 ou superior)

## Passo 2: Criar conta Anthropic e obter a chave

1. Acesse **https://console.anthropic.com**
2. Crie uma conta (precisa de email + verificação)
3. Adicione créditos (a partir de $5 — opção "Build" na tela inicial)
4. Vá em **API Keys** → **Create Key**
5. Copie a chave (começa com `sk-ant-api03-...`)

## Passo 3: Criar conta Tavily (opcional, mas recomendado)

1. Acesse **https://tavily.com**
2. Crie conta gratuita
3. Vá no **Dashboard** → **API Keys** → copie a chave (começa com `tvly-...`)
4. Isso permite que Analysis e Compare pesquisem na internet em tempo real

## Passo 4: Configurar o projeto

Abra o terminal na pasta do Brentor.ai e execute:

```
cd C:\Users\Donyzete\Brentor.ai
copy .env.example .env
```

Agora abra o arquivo `.env` em qualquer editor e preencha:

```
ANTHROPIC_API_KEY=sk-ant-api03-COLE_SUA_CHAVE_AQUI
TAVILY_API_KEY=tvly-COLE_SUA_CHAVE_AQUI
```

## Passo 5: Instalar dependências e iniciar

```
npm install
npm start
```

Pronto! Acesse **http://localhost:4173** no navegador.

Se tudo estiver correto, você verá no terminal:

```
══════════════════════════════════════
  🤖  Brentor.ai — Servidor iniciado
  🌐  http://localhost:4173
  🧠  Claude: claude-3-5-sonnet-20241022
  🔍  Busca web (Tavily): ✅ ativa
══════════════════════════════════════
```

E no portal, o indicador no topo muda para **"IA ativa + busca web"**.

## Custos estimados da API

| Operação | Modelo | Custo aprox. por chamada |
|----------|--------|-------------------------|
| Chat (mensagem) | Haiku | ~$0.001 |
| Analysis | Sonnet | ~$0.02-0.04 |
| Compare | Sonnet | ~$0.03-0.05 |
| Display | Sonnet | ~$0.02-0.03 |
| My News 1.0 | Sonnet | ~$0.02-0.04 |
| My News 2.0 | Sonnet | ~$0.04-0.06 |
| Focus 1.0 | Haiku | ~$0.003-0.01 |
| Focus 2.0 | Sonnet | ~$0.03-0.05 |
| Busca Tavily | — | ~$0.002/busca |

Com $5 de crédito na Anthropic você consegue fazer **centenas de operações**.

## Modo demonstração

Sem o servidor Node.js rodando, o portal funciona normalmente em **modo demonstração** (sem IA real) — basta abrir o `index.html` no navegador.
