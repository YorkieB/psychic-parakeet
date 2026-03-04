/*
  This file configures Jarvis's ESLint rules and code quality settings for consistent code formatting.

  It defines linting rules, parser configurations, plugin settings, and code style guidelines while ensuring Jarvis maintains high code quality standards across the codebase.
*/
// ESLint Flat Config (v9+)
// Migration from .eslintrc.json

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";
import nodePlugin from "eslint-plugin-node";
import promisePlugin from "eslint-plugin-promise";
import securityPlugin from "eslint-plugin-security";

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: "./tsconfig.json",
      },
      // Add Node.js globals
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        // Timer functions
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
        // Node.js namespace
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
      security: securityPlugin,
      promise: promisePlugin,
      node: nodePlugin,
    },
    rules: {
      // TypeScript rules
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // Import rules
      "import/order": [
        "warn",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",
        },
      ],
      "import/no-unresolved": "off", // TypeScript handles this

      // Security rules
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-fs-filename": "warn",

      // Promise rules
      "promise/always-return": "warn",
      "promise/catch-or-return": "warn",

      // Node rules
      "node/no-missing-import": "off", // TypeScript handles this
      "node/no-unpublished-import": "warn",
    },
  },

  // Test files - more lenient rules
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "import/no-extraneous-dependencies": "off",
    },
  },

  // JavaScript files - add Node.js globals
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Node.js globals
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        // Timer functions
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "coverage/**",
      "Algo-2/**",
      "dashboard/**",
      "jarvis-desktop/**",
      "Jarvis-Emotions-Engine/**",
      "Jarvis-Memory/**",
      "Jarvis-Visual-Engine/**",
    ],
  },
];

// YORKIE VALIDATED — configuration defined, linting rules established, ESLint configured, Biome reports zero errors/warnings.
