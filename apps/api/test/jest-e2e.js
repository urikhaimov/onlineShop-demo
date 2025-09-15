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
  // 👇 point at your existing setup file (you named it jest.setup.ts)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30000,
};
