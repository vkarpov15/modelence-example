import { Module, type RouteHandler } from 'modelence/server';

import { getStudioRouter } from '@/server/studio/router';

const studioRouteHandler = (async ({ req, res, next }) => {
  const router = await getStudioRouter();

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      res.off('finish', onDone);
      res.off('close', onDone);
    };

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    };

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const onDone = () => finish();

    res.once('finish', onDone);
    res.once('close', onDone);

    try {
      router(req, res, (error?: unknown) => {
        if (error != null) {
          fail(error);
          return;
        }

        if (!res.headersSent && !res.writableEnded) {
          if (typeof next === 'function') {
            next();
            return;
          }

          res.status(404).end();
        }

        finish();
      });
    } catch (error) {
      fail(error);
    }
  });
}) as RouteHandler;

export default new Module('studio', {
  routes: [
    {
      path: '/studio',
      handlers: {
        use: studioRouteHandler,
      },
    },
    {
      path: '/studio/*',
      handlers: {
        use: studioRouteHandler,
      },
    },
  ],
});
