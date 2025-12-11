import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import prettier from "eslint-config-prettier";
import localRules from "eslint-plugin-local-rules";

export default defineConfig(
  // ベース設定
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettier,

  // グローバル設定
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      "local-rules": localRules,
    },
  },

  // 無視パターン
  {
    ignores: [
      "vitest.config.ts",
      "esbuild.api.config.mjs",
      "dist/",
      "node_modules/",
      "**/*.test.ts",
      "src/generated/**",
      "eslint-local-rules/**",
      "eslint-local-rules.cjs",
      "eslint.config.js",
    ],
  },

  // ルール設定
  {
    rules: {
      // 意図的にoff
      // - no-await-in-loop: DynamoDB paginatorで for await を使用するため
      // - no-misused-spread: Entity更新パターン { ...this, ...updates } で使用するため
      // - no-invalid-void-type: Result<void, Error> は一般的なパターンのため
      "no-await-in-loop": "off",
      "@typescript-eslint/no-misused-spread": "off",
      "@typescript-eslint/no-invalid-void-type": "off",

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

      // プロジェクト規約
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
          allowNullableBoolean: false,
          allowNullableString: false,
          allowNullableNumber: false,
          allowAny: false,
        },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "func-style": "error",

      // local-rules（共通）
      "local-rules/common/no-new-date": "error",

      // local-rules（DDD用）
      "local-rules/domain-model/entity-structure": "error",
      "local-rules/domain-model/value-object-structure": "error",
      "local-rules/domain-model/aggregate-structure": "error",
      "local-rules/domain-model/file-requirements": "error",
      "local-rules/domain-model/no-throw": "error",
      "local-rules/domain-model/no-null": "error",
      "local-rules/domain-model/no-external-deps": "error",
      "local-rules/domain-model/repository-interface": "error",
      "local-rules/use-case/use-case-structure": "error",
      "local-rules/use-case/no-throw": "error",
      "local-rules/use-case/file-requirements": "warn",

      // local-rules（DIコンテナ用）
      "local-rules/di-container/interface-impl-import-pattern": "error",

      // local-rules（ハンドラー層用）
      "local-rules/handler/container-get-restriction": "error",
      "local-rules/handler/single-usecase-call": "error",

      // local-rules（リポジトリ用）
      "local-rules/repository/file-requirements": "warn",
    },
  },
);
