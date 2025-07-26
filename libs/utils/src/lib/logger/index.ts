import type { ILogger } from './logger.interface';
import { cLogger } from '@client/logger';

let logger: ILogger;

if (typeof window === 'undefined') {
  // Node.js/server environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  logger = require('./logger.server').logger;
} else {
  // Browser/client environment
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  logger = cLogger;
}

export { logger };