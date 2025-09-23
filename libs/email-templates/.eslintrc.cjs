// libs/email-templates/.eslintrc.cjs
module.exports = {
  extends: ['../../.eslintrc.json'],
  overrides: [
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        project: [__dirname + '/tsconfig.eslint.json'],
        tsconfigRootDir: __dirname,
      },
    },
  ],
};
