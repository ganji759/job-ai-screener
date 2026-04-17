import pino from 'pino';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function getDevTransport(): pino.TransportSingleOptions | undefined {
  if (process.env.NODE_ENV === 'production') {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    };
  } catch {
    return undefined;
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: getDevTransport(),
});
