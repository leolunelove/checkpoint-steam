import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { createSteam, AppError } from './lib/steam.mjs';

export function makeServer({ key = process.env.STEAM_API_KEY, allowedId = process.env.STEAM_ALLOWED_ID, steam = createSteam({ key, allowedId }) } = {}) {
  const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
  const limits = new Map(); let inflight = 0;
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'" };
  return createServer(async (req, res) => {
    const json = (status, data) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    let active = false;
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return json(405, { error: 'Method not allowed.' });
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/config') return json(200, { configured: Boolean(key), restricted: Boolean(allowedId) });
      if (url.pathname.startsWith('/api/')) {
        // Host and Origin checks stop websites from driving a local server through DNS rebinding.
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) return json(403, { error: 'Cross-origin requests are not allowed.' });
        const host = String(req.headers.host || '').split(':')[0];
        if ((process.env.HOST || '127.0.0.1') === '127.0.0.1' && !['localhost', '127.0.0.1'].includes(host)) return json(403, { error: 'Invalid local host.' });
        const ip = req.socket.remoteAddress, time = Date.now();
        if (limits.size > 1000) for (const [k,v] of limits) if (time > v.reset) limits.delete(k);
        let limit = limits.get(ip);
        if (!limit || time > limit.reset) { limit = { count: 0, reset: time + 60000 }; limits.set(ip, limit); }
        if (++limit.count > 240 || inflight >= 8) return json(429, { error: 'A little breather. Please try again in a minute.' });
        inflight++; active = true;
        if (url.pathname === '/api/library') return json(200, await steam.library(url.searchParams.get('profile')));
        if (url.pathname === '/api/achievements') return json(200, await steam.achievements(url.searchParams.get('profile'), url.searchParams.get('appid')));
        return json(404, { error: 'Endpoint not found.' });
      }
      const pathname = decodeURIComponent(url.pathname);
      const path = resolve(publicRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (!path.startsWith(publicRoot) || pathname.includes('..')) return json(404, { error: 'Not found.' });
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' }[extname(path)];
      if (!mime) return json(404, { error: 'Not found.' });
      const content = await readFile(path);
      res.writeHead(200, { ...headers, 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch (e) { json(e instanceof AppError ? e.status : e.code === 'ENOENT' ? 404 : 500, { error: e instanceof AppError ? e.message : e.code === 'ENOENT' ? 'Not found.' : 'Something went wrong. Please try again.' }); }
    finally { if (active) inflight--; }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || '127.0.0.1', port = Number(process.env.PORT) || 8787;
  makeServer().listen(port, host, () => console.log(`Checkpoint is ready at http://${host}:${port}`));
}
