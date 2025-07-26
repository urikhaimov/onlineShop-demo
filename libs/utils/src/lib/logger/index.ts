import type { ILogger } from './logger.interface';
import { cLogger } from './logger.client';

let logger: ILogger;

if (typeof window === 'undefined') {
  // Node.js/server environment

  logger = require('./logger.server').logger;
} else {
  // Browser/client environment

  logger = cLogger;
}

export { logger };
