export function localApiDev(routes) {
  return {
    name: 'local-api-dev',
    apply: 'serve',
    configureServer(server) {
      const env = createLocalApiEnv(server);
      process.env.ALLOWED_API_ORIGINS = env.ALLOWED_API_ORIGINS;

      server.middlewares.use(async (req, res, next) => {
        const route = findRoute(routes, req.url);

        if (!route) {
          next();
          return;
        }

        try {
          const apiModule = await server.ssrLoadModule(route.module);
          const response = await callRouteHandler(
            apiModule,
            route,
            env,
            await createFetchRequest(req)
          );
          await writeFetchResponse(res, response);
        } catch (error) {
          console.error(`Local API route failed: ${route.path}`, error);
          writeJsonError(res);
        }
      });
    },
  };
}

function callRouteHandler(apiModule, route, env, request) {
  if (route.handler) {
    const handler = apiModule[route.handler];

    if (typeof handler !== 'function') {
      throw new Error(`Missing API handler export: ${route.handler}`);
    }

    return handler(request);
  }

  const createApi = apiModule[route.createApi];

  if (typeof createApi !== 'function') {
    throw new Error(`Missing API factory export: ${route.createApi}`);
  }

  return createApi({ env })(request);
}

function createLocalApiEnv(server) {
  const port = server.config.server.port || 3000;
  const localOrigins = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  return {
    ...process.env,
    ALLOWED_API_ORIGINS: [process.env.ALLOWED_API_ORIGINS, ...localOrigins]
      .filter(Boolean)
      .join(','),
  };
}

function findRoute(routes, url = '') {
  const pathname = url.split('?')[0];
  return routes.find(route => getRoutePaths(route).includes(pathname));
}

function getRoutePaths(route) {
  return Array.isArray(route.path) ? route.path : [route.path];
}

async function createFetchRequest(req) {
  const headers = createFetchHeaders(req);
  const url = new URL(req.url || '/', `http://${headers.get('host') || 'localhost:3000'}`);
  const method = req.method || 'GET';
  const init = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await readRequestBody(req);
  }

  return new Request(url, init);
}

function createFetchHeaders(req) {
  const headers = new Headers();

  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach(item => headers.append(name, item));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  if (!headers.has('x-nf-client-connection-ip')) {
    headers.set('x-nf-client-connection-ip', getClientIp(req));
  }

  return headers;
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  );
}

async function readRequestBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

async function writeFetchResponse(res, response) {
  if (!response) {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.statusCode = response.status;

  const setCookie = response.headers.getSetCookie?.();
  if (setCookie?.length) {
    res.setHeader('Set-Cookie', setCookie);
  }

  response.headers.forEach((value, name) => {
    if (name.toLowerCase() !== 'set-cookie') {
      res.setHeader(name, value);
    }
  });

  if (!response.body) {
    res.end();
    return;
  }

  res.end(Buffer.from(await response.arrayBuffer()));
}

function writeJsonError(res) {
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: { code: 'local_api_failed', message: 'Local API failed' } }));
}
