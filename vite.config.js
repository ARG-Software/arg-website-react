import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import seoPrerender from './plugins/seo-prerender/index.js';


export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '@constants': fileURLToPath(new URL('./src/constants', import.meta.url)),
      '@providers': fileURLToPath(new URL('./src/providers', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/utils', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/styles', import.meta.url)),
    },
  },
  plugins: [
    react(),
    ViteImageOptimizer({
      png: { quality: 100 },
      jpeg: { quality: 100 },
      jpg: { quality: 100 },
      webp: { quality: 100 },
      svg: {
        multipass: true,
        plugins: [{ name: 'preset-default' }],
      },
    }),
    seoPrerender({ apply: 'build' }),
    // Inject <link rel="preload"> for CSS at the very top of <head> so the
    // browser starts fetching it before parsing the JSON-LD blocks below it.
    {
      name: 'preload-css',
      apply: 'build',
      transformIndexHtml: {
        order: 'post',
        handler(html, ctx) {
          if (!ctx.bundle) return;
          return Object.keys(ctx.bundle)
            .filter(k => k.endsWith('.css'))
            .map(file => ({
              tag: 'link',
              attrs: { rel: 'preload', href: `/${file}`, as: 'style' },
              injectTo: 'head-prepend',
            }));
        },
      },
    },
    // Local ask endpoint: proxies /.netlify/functions/ask to askQuestion() in dev
    {
      name: 'local-ask-endpoint',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url !== '/.netlify/functions/ask' || req.method !== 'POST') {
            return next();
          }

          let body = '';
          for await (const chunk of req) body += chunk;

          try {
            const { askQuestion } = await import('./rag/runtime/ask.ts');
            const payload = JSON.parse(body || '{}');
            const result = await askQuestion({
              question: payload.question,
              messages: payload.messages,
              pageContext: payload.pageContext,
            });

            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                answer: result.answer,
                citations: result.citations,
                articleRecommendations: result.articleRecommendations,
                actions: result.actions,
              })
            );
          } catch (error) {
            const isConfigurationError =
              error instanceof Error &&
              error.message.startsWith('Missing required environment variables:');
            const statusCode = isConfigurationError
              ? 503
              : error?.name === 'RagValidationError'
                ? 400
                : 500;
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: {
                  code: isConfigurationError ? 'configuration_error' : error?.code || 'answer_failed',
                  message: isConfigurationError
                    ? 'Assistant configuration is unavailable'
                    : statusCode === 500
                      ? 'Unable to answer the question'
                      : error.message,
                },
              })
            );
          }
        });
      },
    },
    // SPA fallback: serve index.html for routes without file extensions
    {
      name: 'spa-fallback',
      apply: 'serve',
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            // Skip processing if it has a file extension or is a known static path
            if (req.url.includes('.') || req.url.startsWith('/node_modules')) {
              next();
              return;
            }

            // For navigation requests without extensions, serve index.html
            // This allows React Router to handle the routing
            const acceptHeader = req.headers.accept || '';
            if (acceptHeader.includes('text/html')) {
              req.url = '/';
            }
            next();
          });
        };
      },
    },
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    minify: 'esbuild',
    cssMinify: true,
    chunkSizeWarningLimit: 750,
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/react-helmet-async') ||
            id.includes('node_modules/scheduler')
          ) {
            return 'vendor';
          }
          if (id.includes('node_modules/three')) {
            return 'three';
          }
          if (id.includes('node_modules/gsap')) {
            return 'gsap';
          }
          if (id.includes('node_modules/highlight.js')) {
            return 'hljs';
          }
        },
      },
    },
  },
  };
});
