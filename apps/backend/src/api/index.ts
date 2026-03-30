import fastify from 'fastify';
import { env } from '../config.js';
import app from './app.js';

const server = fastify({
  logger: true
});

// Environment Validation is now handled in config.ts

async function main() {
  try {
    // 1. Register App
    await server.register(app);

    // 2. Start Listening
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.API_HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Turon API is running at http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
