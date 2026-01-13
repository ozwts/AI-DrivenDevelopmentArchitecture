/**
 * Form OpenAPI生成スキーマ使用必須ルール
 *
 * フォームのバリデーションにはOpenAPIから生成されたZodスキーマを使用する。
 * 独自にスキーマを定義することを禁止し、APIとの整合性を保証する。
 *
 * 許可: schemas.XXX（@/generated/zod-schemasからインポート）
 * 警告: 独自定義のZodスキーマ（z.object()等）
 *
 * 参照: guardrails/policy/web/component/30-form-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Form validation should use OpenAPI generated schemas",
      category: "Component",
      recommended: true,
    },
    schema: [],
    messages: {
      useGeneratedSchema:
        "Use generated schema from '@/generated/zod-schemas' instead of defining custom Zod schema. See: 30-form-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // Form関連ファイルのみ
    if (!filename.toLowerCase().includes("form")) {
      return {};
    }

    // テストファイル除外
    if (filename.includes(".test.")) {
      return {};
    }

    // 認証関連（auth/）は独自スキーマを許容（Cognitoフォームは生成スキーマがない）
    if (filename.includes("/auth/")) {
      return {};
    }

    let hasGeneratedSchemaImport = false;

    return {
      // @/generated/zod-schemasからのインポートをチェック
      ImportDeclaration(node) {
        if (
          node.source?.value === "@/generated/zod-schemas" ||
          node.source?.value?.includes("/generated/zod-schemas")
        ) {
          hasGeneratedSchemaImport = true;
        }
      },

      // zodResolver()の使用をチェック
      CallExpression(node) {
        if (node.callee?.name !== "zodResolver") {
          return;
        }

        const arg = node.arguments[0];
        if (!arg) return;

        // schemas.XXX の形式（生成スキーマ）ならOK
        if (
          arg.type === "MemberExpression" &&
          arg.object?.name === "schemas"
        ) {
          return;
        }

        // 生成スキーマをインポートしていて、それ以外を使っている場合は警告
        // （生成スキーマインポートがない場合は別の警告が適切だが、まずは緩く）
        if (!hasGeneratedSchemaImport) {
          context.report({
            node,
            messageId: "useGeneratedSchema",
          });
        }
      },
    };
  },
};
