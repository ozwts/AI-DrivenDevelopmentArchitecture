/**
 * Entityメソッド命名規則ルール
 *
 * Entityのメソッドはドメイン言語で命名し、技術用語を避ける。
 * set*, get*, update* よりも具体的な動詞を使用する。
 *
 * 参照: guardrails/policy/server/domain-model/21-entity-implementation.md
 */

"use strict";

// 禁止する技術的なメソッド名パターン
const FORBIDDEN_PREFIXES = ["set", "get", "update"];

// 許可される例外（よく使われるドメイン用語）
const ALLOWED_METHODS = [
  "getProps", // PropsパターンでのDI用
  "getId", // ID取得は許可（明確な意図）
];

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Enforce domain-driven naming conventions for Entity methods",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      technicalNaming:
        "Entityのメソッド名 '{{ name }}' は技術的な命名です。ドメイン言語で命名してください。例: setStatus → complete, markAsCompleted / updatePriority → changePriority, escalate",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model/ 配下のみ対象
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // リポジトリインターフェースは除外
    if (filename.includes("-repository.ts")) {
      return {};
    }

    const sourceCode = context.getSourceCode();

    return {
      ClassDeclaration(node) {
        // Entityパターンの検出
        const isEntity =
          node.implements?.some((impl) => {
            const implText = sourceCode.getText(impl);
            return implText.includes("Entity");
          }) ?? false;

        if (!isEntity) {
          return;
        }

        // メソッド定義をチェック
        for (const member of node.body.body) {
          if (member.type !== "MethodDefinition") {
            continue;
          }

          if (member.kind !== "method") {
            continue;
          }

          const methodName = member.key?.name;
          if (!methodName) {
            continue;
          }

          // 許可リストに含まれる場合はスキップ
          if (ALLOWED_METHODS.includes(methodName)) {
            continue;
          }

          // 禁止プレフィックスをチェック
          for (const prefix of FORBIDDEN_PREFIXES) {
            if (
              methodName.startsWith(prefix) &&
              methodName.length > prefix.length &&
              methodName[prefix.length] ===
                methodName[prefix.length].toUpperCase()
            ) {
              context.report({
                node: member.key,
                messageId: "technicalNaming",
                data: { name: methodName },
              });
              break;
            }
          }
        }
      },
    };
  },
};
