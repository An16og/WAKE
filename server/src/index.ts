import fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { checkProviderHealth, getProviderConfig } from './provider.js';

// Load environment variables
dotenv.config();
// Also attempt to load from root .env if running from workspace
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

await app.register(cors, {
  origin: true
});

// Health check endpoint
app.get('/health', async (_request, reply) => {
  const health = await checkProviderHealth();
  const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 200 : 503;
  return reply.status(statusCode).send(health);
});

app.get('/api/health', async (_request, reply) => {
  const health = await checkProviderHealth();
  return reply.send(health);
});

// Static file serving for client dist in production or single-service deployment
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  await app.register(fastifyStatic, {
    root: clientDistPath,
    prefix: '/'
  });

  // Catch-all route to serve index.html for SPA/client
  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile('index.html');
  });
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const config = getProviderConfig();
    console.log(`[WAKE.EXE Server] Provider configured: ${config.provider} (model: ${config.gemmaModel})`);
    await app.listen({ port: PORT, host: HOST });
    console.log(`[WAKE.EXE Server] Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
