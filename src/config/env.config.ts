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
  jwt: {
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
  },
}));
