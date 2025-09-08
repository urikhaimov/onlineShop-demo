import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJECT_ID = 'onlinestoretemplate-59d3e';
const BUCKET = `${PROJECT_ID}.firebasestorage.app`;

const RULES = readFileSync(
  path.resolve(process.cwd(), '../../storage.rules'), // repo root
  'utf8',
);

// explicit emulator host/port
const [ST_HOST, ST_PORT_STR] = (
  process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'
).split(':');
const ST_PORT = Number(ST_PORT_STR || 9199);

let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: {
      host: ST_HOST,
      port: ST_PORT,
      rules: RULES,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ...rest of your tests unchanged...
