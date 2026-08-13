import { z } from 'zod';

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  APP_TIMEZONE: z.string().min(1).default('America/Cuiaba'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('8h'),
  ADMIN_NAME: z.string().min(1).default('Administrador'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(12).optional(),
  UPLOAD_TEMP_DIR: z.string().default('/tmp/confirma-sus'),
});

export type Environment = z.infer<typeof environmentSchema>;

let cachedEnvironment: Environment | undefined;

export function environment(): Environment {
  cachedEnvironment ??= environmentSchema.parse(process.env);
  return cachedEnvironment;
}
