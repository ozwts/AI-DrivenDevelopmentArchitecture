/**
 * container.get 制限ルール
 *
 * hono-handler/ 内のハンドラーファイルで:
 * - container.get() で取得できるのは Logger と UseCase のみ
 * - Repository, AuthClient, その他サービスの直接取得は禁止
 *
 * 対象パターン:
 * - container.get<Repository>(...) → 禁止
 * - container.get<AuthClient>(...) → 禁止
 * - container.get<Logger>(...) → 許可
 * - container.get<...UseCase>(...) → 許可
 *
 * 参照: guardrails/policy/server/handler/20-handler-implementation.md
 */

"use strict";

/**
 * 許可されるサービスの判定
 * @param {string} typeName - 型名
 * @returns {boolean}
 */
const isAllowedService = (typeName) => {
  if (!typeName) return true; // 型引数がない場合はチェックスキップ

  // Logger は許可
  if (typeName === "Logger") return true;

  // UseCase で終わるものは許可
  if (typeName.endsWith("UseCase")) return true;

  return false;
};

/**
 * 禁止パターンの判定とエラーメッセージ生成
 * @param {string} typeName - 型名
 * @returns {{ forbidden: boolean, category: string } | null}
 */
const getForbiddenInfo = (typeName) => {
  if (!typeName) return null;

  // Repository パターン
  if (typeName.endsWith("Repository")) {
    return { forbidden: true, category: "Repository" };
  }

  // AuthClient パターン
  if (typeName === "AuthClient" || typeName.endsWith("Client")) {
    return { forbidden: true, category: "外部サービスクライアント" };
  }

  // その他禁止パターン（将来の拡張用）
  const forbiddenPatterns = [
    { pattern: /Storage$/, category: "ストレージサービス" },
    { pattern: /Service$/, category: "外部サービス" },
    { pattern: /Provider$/, category: "プロバイダー" },
  ];

  for (const { pattern, category } of forbiddenPatterns) {
    if (pattern.test(typeName)) {
      return { forbidden: true, category };
    }
  }

  return null;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Handlers can only use container.get for Logger and UseCase",
      category: "Handler Layer",
      recommended: true,
    },
    schema: [],
    messages: {
      forbiddenContainerGet:
        "ハンドラーで{{category}}（{{typeName}}）を直接取得することは禁止されています。UseCase経由でアクセスしてください。参照: handler/20-handler-implementation.md",
      unknownServiceType:
        "ハンドラーで container.get に許可されているのは Logger と UseCase のみです。'{{typeName}}' は許可されていません。参照: handler/20-handler-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // hono-handler/ 内の *-handler.ts ファイルのみ対象
    if (!filename.includes("/hono-handler/")) {
      return {};
    }

    if (!filename.endsWith("-handler.ts")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      CallExpression(node) {
        // container.get<Type>(...) パターンを検出
        const callee = node.callee;

        // MemberExpression: container.get
        if (callee.type !== "MemberExpression") return;
        if (callee.property?.name !== "get") return;

        // 呼び出し元が container という名前か確認
        // container.get または someVar.get の形式
        const objectName = callee.object?.name;
        if (objectName !== "container") return;

        // 型引数を取得
        const typeArgs = node.typeArguments || node.typeParameters;
        if (!typeArgs || typeArgs.params.length === 0) {
          // 型引数なしの場合はスキップ（TypeScriptの型推論に任せる）
          return;
        }

        const typeParam = typeArgs.params[0];
        let typeName = null;

        // TSTypeReference の場合（例: container.get<Logger>(...)）
        if (typeParam.type === "TSTypeReference") {
          typeName = typeParam.typeName?.name;
        }

        if (!typeName) return;

        // 許可されているかチェック
        if (isAllowedService(typeName)) {
          return;
        }

        // 禁止パターンの判定
        const forbiddenInfo = getForbiddenInfo(typeName);

        if (forbiddenInfo) {
          context.report({
            node,
            messageId: "forbiddenContainerGet",
            data: {
              typeName,
              category: forbiddenInfo.category,
            },
          });
        } else {
          // 明示的に許可されていないが、禁止パターンにも該当しない場合
          context.report({
            node,
            messageId: "unknownServiceType",
            data: { typeName },
          });
        }
      },
    };
  },
};
