/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ['./base.js'],
  env: { browser: true, es2022: true },
  settings: { react: { version: 'detect' } },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
};
