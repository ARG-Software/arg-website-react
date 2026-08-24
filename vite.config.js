import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import seoPrerender from './plugins/seo-prerender/index.js';
import { localApiDev } from './plugins/local-api-dev/index.js';


export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  return {
  assetsInclude: ['**/*.md'],
  resolve: {
    alias: {
      '@components': fileURLToPath(new URL('./src/frontend/components', import.meta.url)),
      '@hooks': fileURLToPath(new URL('./src/frontend/hooks', import.meta.url)),
      '@constants': fileURLToPath(new URL('./src/frontend/constants', import.meta.url)),
      '@providers': fileURLToPath(new URL('./src/frontend/providers', import.meta.url)),
      '@utils': fileURLToPath(new URL('./src/frontend/utils', import.meta.url)),
      '@services': fileURLToPath(new URL('./src/frontend/services', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/frontend/data', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/frontend/styles', import.meta.url)),
      '@admin': fileURLToPath(new URL('./src/frontend/admin', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/packages/ui/src', import.meta.url)),
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
    localApiDev([
      {
        path: '/api/assistant/challenge',
        module: '/src/backend/rag/apps/gaspar/assistantChallengeApi.js',
        createApi: 'createAssistantChallengeApi',
      },
      {
        path: '/api/assistant/ask',
        module: '/src/backend/rag/apps/gaspar/assistantAskApi.js',
        createApi: 'createAssistantAskApi',
      },
      {
        path: '/api/assistant/ui-copy',
        module: '/src/backend/rag/apps/gaspar/assistantUiCopyApi.js',
        createApi: 'createAssistantUiCopyApi',
      },
      {
        path: '/api/security/challenge',
        module: '/src/backend/rag/apps/gaspar/securityChallengeApi.js',
        createApi: 'createSecurityChallengeApi',
      },
      {
        path: '/api/security/verify',
        module: '/src/backend/rag/apps/gaspar/securityVerifyApi.js',
        createApi: 'createSecurityVerifyApi',
      },
      {
        path: '/api/admin/outreach',
        module: '/src/backend/admin/apps/adminOutreachApi.ts',
        createApi: 'createAdminOutreachApi',
      },
      {
        path: '/api/admin/assistant-conversation-log',
        module: '/src/backend/admin/apps/assistantConversationLogApi.ts',
        createApi: 'createAssistantConversationLogApi',
      },
      {
        path: '/api/admin/assistant-conversations',
        module: '/src/backend/admin/apps/adminAssistantConversationsApi.ts',
        createApi: 'createAdminAssistantConversationsApi',
      },
      {
        path: '/api/admin/assistant-conversations-retention',
        module: '/src/backend/admin/apps/assistantConversationsRetentionApi.ts',
        createApi: 'createAssistantConversationsRetentionApi',
      },
      {
        path: '/api/visit-log',
        module: '/src/backend/admin/apps/visitLogApi.ts',
        createApi: 'createVisitLogApi',
      },
      {
        path: '/api/admin/visit-metrics',
        module: '/src/backend/admin/apps/visitMetricsApi.ts',
        createApi: 'createVisitMetricsApi',
      },
      {
        path: '/api/admin/visit-events-retention',
        module: '/src/backend/admin/apps/visitRetentionApi.ts',
        createApi: 'createVisitRetentionApi',
      },
      {
        path: '/api/admin/login',
        module: '/src/backend/admin/apps/adminLoginApi.ts',
        createApi: 'createAdminLoginApi',
      },
      {
        path: '/api/admin/session',
        module: '/src/backend/admin/apps/adminSessionApi.ts',
        createApi: 'createAdminSessionApi',
      },
      {
        path: '/api/admin/user',
        module: '/src/backend/admin/apps/adminUserApi.ts',
        createApi: 'createAdminUserApi',
      },
    ]),
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
