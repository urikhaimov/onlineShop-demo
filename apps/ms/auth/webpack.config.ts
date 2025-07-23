import { join } from 'path';
import { NxAppWebpackPlugin } from '@nx/webpack/app-plugin';

module.exports = {
  output: {
    path: join(__dirname, '../../../dist/apps/ms/auth'),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    }),
  ],
};
