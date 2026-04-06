import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'api/index': 'src/api/index.ts',
    'bot/index': 'src/bot/index.ts',
  },
  format: ['esm'],
  target: 'es2022',
  clean: true,
  bundle: true,
  noExternal: ['@turon/shared'],
  external: ['@prisma/client', '.prisma/client', 'prisma'],
  outDir: 'dist'
});
