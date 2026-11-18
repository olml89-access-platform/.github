'use strict';

const js = require('@eslint/js');

module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['.github/actions/pr-automation/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        fetch: 'readonly',
        module: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
];
