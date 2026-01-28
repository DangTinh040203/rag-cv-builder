import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import parser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      '**/eslint.config.mjs',
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'mongodb_data/**',
      'logs/**',
      'tsconfig.json',
      '**/*.js',
    ],
  },

  eslint.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  eslintPluginPrettierRecommended,

  ...compat.extends(
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ),

  ...compat.plugins('immer', 'import', 'simple-import-sort'),

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      parser: parser,
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        projectService: true,

        tsconfigRootDir: __dirname,
      },
    },

    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-call': 0,
      '@typescript-eslint/no-unsafe-assignment': 0,
      '@typescript-eslint/no-unsafe-argument': 0,
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-misused-promises': [
        'warn',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],

      'import/no-unresolved': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/extensions': 'off',

      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',

      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../**/*', './*', './**/*'],
              message:
                'Relative imports are not allowed. Please use path aliases instead.',
            },
          ],
        },
      ],

      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsForRegex: ['^draft', 'state'],
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'immer/no-update-map': 'error',
    },
  },
);
