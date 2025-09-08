// apps/client/src/tests/firestore/firestore.rules.node.spec.ts
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const PROJECT_ID = 'onlinestoretemplate-59d3e';

const RULES = readFileSync(
  path.resolve(process.cwd(), '../../firestore.rules'),
  'utf8',
);

const [FS_HOST, FS_PORT_STR] = (
  process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
).split(':');
const FS_PORT = Number(FS_PORT_STR || 8080);

let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: FS_HOST, port: FS_PORT, rules: RULES },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});
