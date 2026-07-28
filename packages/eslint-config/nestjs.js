/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  env: { node: true },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
  },
};
