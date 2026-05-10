import { registerAs } from '@nestjs/config';

const parsePort = (value: string | undefined) => Number(value ?? 3000);

export const envConfig = registerAs('env', () => ({
  app: {
    name: process.env.APP_NAME ?? 'be-keuangan',
    port: parsePort(process.env.PORT),
  },
  database: {
    mongodbUri: process.env.MONGODB_URI,
  },
}));
