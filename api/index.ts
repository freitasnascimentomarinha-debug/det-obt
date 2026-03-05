import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../server-supabase.ts';

let appPromise: Promise<any> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = createApp({ serverless: true }).then(({ app }) => app);
  }

  // Vercel rewrites deliver req.url as the destination ("/api").
  // Reconstruct the original path from x-now-route-matches header.
  const routeMatches = req.headers['x-now-route-matches'] as string | undefined;
  if (routeMatches) {
    const params = new URLSearchParams(routeMatches);
    const captured = params.get('path');
    if (captured) {
      const qIdx = (req.url || '').indexOf('?');
      const qs = qIdx >= 0 ? (req.url || '').substring(qIdx) : '';
      req.url = `/api/${decodeURIComponent(captured)}${qs}`;
    }
  }

  const app = await appPromise;
  return app(req, res);
}
