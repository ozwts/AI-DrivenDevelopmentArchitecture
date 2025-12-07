import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import localRules from "eslint-plugin-local-rules";
import globals from "globals";

export default defineConfig(
  // ベース設定
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettier,

  // グローバル設定
  {
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "local-rules": localRules,
    },
  },

  // 無視パターン
  {
    ignores: [
      "dist/",
      "node_modules/",
      "build/",
      "coverage/",
      "src/generated/**",
      "postcss.config.js",
      "tailwind.config.js",
      "vite.config.ts",
      "public/mockServiceWorker.js",
      "playwright/",
      "playwright-report/",
      "test-results/",
      "**/*.ss.test.ts-snapshots/",
      "**/*.ct.test.tsx-snapshots/",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.ct.test.tsx",
      "**/*.ss.test.ts",
      "eslint.config.js",
      "eslint-local-rules/**",
      "eslint-local-rules.cjs",
      "playwright-ct.config.ts",
      "playwright-ss.config.ts",
      "src/mocks/**",
    ],
  },

  // ルール設定
  {
    rules: {
      // React Hooks
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      // ===== Serverと共通のルール =====

      // unused-imports プラグインで未使用import検出と自動削除(--fix)を両立
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],

      // プロジェクト規約（Serverと共通）
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      eqeqeq: ["error", "always", { null: "ignore" }],

      // 意図的にoff（Serverと共通）
      // - no-invalid-void-type: Promise<void> は一般的なパターンのため
      "@typescript-eslint/no-invalid-void-type": "off",

      // ===== React固有の調整 =====

      // func-style: Reactではアロー関数・関数宣言どちらも一般的なためoff
      // Server: error（関数式を強制）
      // Web: off（コンポーネントは関数宣言/アロー関数どちらでもOK）
      "func-style": "off",

      // strict-boolean-expressions: JSXの条件レンダリングで冗長になるためoff
      // Server: error（厳格なboolean チェック）
      // Web: off（{items.length > 0 && <List />} のようなパターンを許容）
      "@typescript-eslint/strict-boolean-expressions": "off",

      // no-misused-promises: JSX属性（onClick等）でのasync関数を許容
      // Server: 暗黙的にerror
      // Web: attributes のみ除外（通常のPromise誤用は検出）
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],

      // no-floating-promises: useEffect内でのasync即時関数を許容
      // Server: 暗黙的にerror
      // Web: off（Reactでは void asyncFn() パターンが一般的）
      "@typescript-eslint/no-floating-promises": "off",

      // no-confusing-void-expression: void式の混乱を防ぐ
      // Server: 暗黙的にerror
      // Web: error（明示的に { } でブロックを書く）
      "@typescript-eslint/no-confusing-void-expression": "error",

      // prefer-nullish-coalescing: nullish coalescing演算子を推奨
      // Server: 暗黙的にerror
      // Web: error（空文字列の扱いに注意してコードを書く）
      "@typescript-eslint/prefer-nullish-coalescing": "error",

      // restrict-template-expressions: numberをテンプレートリテラルで使うのは一般的
      // Server: 暗黙的にerror
      // Web: numberとbooleanを許容
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true, allowBoolean: true },
      ],

      // no-deprecated: 非推奨APIの使用を禁止
      "@typescript-eslint/no-deprecated": "error",

      // non-nullable-type-assertion-style: `as T`より`!`を推奨するルールだが、
      // `!`は危険なためoffにし、明示的な`as`を許容
      "@typescript-eslint/non-nullable-type-assertion-style": "off",

      // ===== local-rules（Web固有） =====

      // 共通: 依存の方向（routes → features → lib）
      "local-rules/common/dependency-direction": "error",

      // 共通: 直接fetch呼び出し禁止（apiClient使用）
      "local-rules/common/no-direct-fetch": "warn",

      // コンポーネント設計: Props型のreadonly修飾子
      "local-rules/component/props-readonly": "warn",

      // Feature設計: Feature間直接インポート禁止
      "local-rules/feature/no-cross-feature-import": "error",

      // 技術基盤: lib/内でのProvider/Context禁止
      "local-rules/lib/no-provider-context": "error",

      // デザイン: Tailwind arbitrary values禁止
      "local-rules/design/no-arbitrary-values": "error",
    },
  },
);
