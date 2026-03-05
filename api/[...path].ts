import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server-supabase.ts';

let appPromise: Promise<any> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp({ serverless: true }).then(({ app }) => app);
  }

  const app = await appPromise;
  return app(req, res);
}
