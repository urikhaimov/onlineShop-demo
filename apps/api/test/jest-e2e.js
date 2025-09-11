// apps/api/test/jest-e2e.js
const path = require('path');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require(
  path.resolve(__dirname, '../../../tsconfig.base.json'),
);

module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.e2e[-\\.]?(spec|test)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      { tsconfig: '<rootDir>/../../../tsconfig.base.json' },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, {
    prefix: '<rootDir>/../../../',
  }),
  setupFilesAfterEnv: ['<rootDir>/setup-e2e.ts'],
  testTimeout: 30000,
};
