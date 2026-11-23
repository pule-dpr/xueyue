import { resolve } from 'node:path';

import { createApp } from './app.mjs';

const port = Number(process.env.PORT || 3100);
const host = process.env.HOST || '127.0.0.1';
const databasePath = resolve(
  process.cwd(),
  process.env.DATABASE_PATH || 'server/data/xueyue.sqlite',
);
const authSecret = process.env.AUTH_SECRET || 'xueyue-development-secret';

if (process.env.NODE_ENV === 'production' && authSecret === 'xueyue-development-secret') {
  throw new Error('生产环境必须设置 AUTH_SECRET。');
}

const { server } = createApp({
  databasePath,
  authSecret,
  smsProvider: process.env.SMS_PROVIDER || 'development',
  devCode: process.env.DEV_AUTH_CODE || '246810',
  corsOrigin: process.env.CORS_ORIGIN || '*',
});

server.listen(port, host, () => {
  console.log(`雪约 API 已启动：http://${host}:${port}`);
  console.log(`SQLite：${databasePath}`);
  console.log(`短信模式：${process.env.SMS_PROVIDER || 'development'}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
