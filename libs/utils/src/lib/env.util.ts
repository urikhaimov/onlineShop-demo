import { logger } from './logger';

enum EEnvKeys {
  PRODUCTION = 'production',
  DEVELOPMENT = 'development',
}

export interface IGetEnvOptions<T = Record<string, any>> {
  env?: T | NodeJS.ProcessEnv;
  defaultValue?: string | number;
}

/**
 * Retrieves an environment variable value safely.
 */
export const getEnv = (key: string, opts?: IGetEnvOptions): string | number => {
  try {
    const target = opts?.env ?? process.env;
    const value = target?.[key];

    if (value === undefined || value === null || value === '') {
      const msg = `Environment variable ${key} is not set.`;

      logger.warn(msg);

      if (opts?.defaultValue !== undefined) {
        logger.info(`Using default value for ${key}: ${opts.defaultValue}`);
        return opts.defaultValue;
      }

      throw new Error(msg);
    }

    return value;
  } catch (error) {
    logger.error(`Error retrieving environment variable ${key}:`, error);
    throw error;
  }
};

export const isProd = (): boolean =>
  getEnv('NODE_ENV', { env: process.env }) === EEnvKeys.PRODUCTION;

export const isDev = (): boolean =>
  getEnv('NODE_ENV', { env: process.env }) === EEnvKeys.DEVELOPMENT;
