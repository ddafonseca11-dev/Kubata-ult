import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const root = join(process.cwd(), 'dist');
const port = Number(process.env.PORT) || 4173;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  let filePath = normalize(join(root, urlPath));
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }

  if (urlPath === '/' || !existsSync(filePath) || !extname(filePath)) {
    filePath = join(root, 'index.html');
  }
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': types[extname(filePath)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    try {
      const body = await readFile(join(root, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  }
});

server.listen(port, '0.0.0.0', () => console.log(`SPA server on http://0.0.0.0:${port}`));
