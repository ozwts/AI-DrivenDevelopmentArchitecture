/**
 * セレクタ優先度ルール
 *
 * テストでのセレクタ選択において、アクセシビリティ優先のセレクタを推奨。
 *
 * 優先順位:
 * 1. getByRole / getByLabelText - アクセシビリティ属性を使用（最優先）
 * 2. getByText / getByPlaceholder - 表示テキストを使用
 * 3. getByTestId - data-testid属性を使用（最後の手段）
 *
 * 理由:
 * - アクセシビリティ属性を使用することで、スクリーンリーダー対応も同時にテスト
 * - data-testidは実装詳細に依存するため、リファクタリング時に壊れやすい
 * - ユーザーが実際に見る・操作する要素を特定することでテストの意図が明確に
 *
 * 参照: guardrails/policy/web/component/20-selector-strategy.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Prefer getByRole/getByLabelText over getByTestId in tests",
      category: "Test",
      recommended: true,
    },
    schema: [],
    messages: {
      preferAccessibleSelector:
        "Prefer getByRole or getByLabelText over getByTestId. Use data-testid only as a last resort. See: 20-selector-strategy.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // テストファイルのみ対象
    if (!filename.includes(".test.") && !filename.includes(".spec.")) {
      return {};
    }

    // data-testidの使用回数を追跡
    let testIdUsageCount = 0;
    let roleUsageCount = 0;
    const testIdNodes = [];

    return {
      CallExpression(node) {
        if (node.callee.type !== "MemberExpression") {
          return;
        }

        const property = node.callee.property;
        if (property.type !== "Identifier") {
          return;
        }

        const methodName = property.name;

        // getByRole, getByLabelText の使用を追跡
        if (
          methodName === "getByRole" ||
          methodName === "getByLabelText" ||
          methodName === "findByRole" ||
          methodName === "findByLabelText" ||
          methodName === "queryByRole" ||
          methodName === "queryByLabelText"
        ) {
          roleUsageCount++;
        }

        // getByTestId の使用を検出
        if (
          methodName === "getByTestId" ||
          methodName === "findByTestId" ||
          methodName === "queryByTestId"
        ) {
          testIdUsageCount++;
          testIdNodes.push(node);
        }
      },

      "Program:exit"() {
        // getByTestIdが過度に使用されている場合（役割ベースより多い場合）に警告
        // ただし、テストファイル全体で1-2回程度の使用は許容
        if (testIdUsageCount > 2 && testIdUsageCount > roleUsageCount) {
          for (const testIdNode of testIdNodes) {
            context.report({
              node: testIdNode,
              messageId: "preferAccessibleSelector",
            });
          }
        }
      },
    };
  },
};
