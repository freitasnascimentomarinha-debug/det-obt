<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d14f963c-59fb-4a65-b108-7c923879275b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy na Vercel

Este repositório já está preparado para Vercel com:
- frontend Vite gerado em `dist`
- API serverless em `api/index.ts`
- roteamento via `vercel.json`

### 1. Importar projeto na Vercel
- Clique em `Add New Project` na Vercel
- Selecione este repositório

### 2. Configurar variáveis de ambiente (Project Settings -> Environment Variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

### 3. Build settings
- Build Command: `npm run build`
- Output Directory: `dist`

### 4. Deploy
- Clique em `Deploy`

## Observações importantes

- A Vercel não mantém conexões WebSocket persistentes do mesmo jeito que um servidor dedicado. O chat/notificações em tempo real pode exigir provedor dedicado de WebSocket para produção robusta.
- O backend usa Supabase, então as tabelas e políticas precisam estar aplicadas no seu projeto Supabase antes do deploy.
