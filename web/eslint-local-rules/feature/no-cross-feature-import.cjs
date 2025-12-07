/**
 * Feature間直接インポート禁止ルール
 *
 * features/ 内のモジュールは他の features/ を直接インポートしてはならない。
 * 共通機能はapp層で組み合わせる。
 *
 * 参照: guardrails/policy/web/feature/10-feature-overview.md
 *       - 実施しないこと: feature間の直接インポート → app層で組み合わせ
 */

"use strict";

/**
 * パスからfeature名を抽出
 */
const getFeatureName = (filePath) => {
  const match = filePath.match(/\/features\/([^/]+)/);
  return match ? match[1] : null;
};

/**
 * インポートパスからfeature名を抽出
 */
const getImportFeatureName = (importPath) => {
  // @/features/auth/... パターン
  const aliasMatch = importPath.match(/^@\/features\/([^/]+)/);
  if (aliasMatch) return aliasMatch[1];

  // 相対パス ../../../features/auth/... パターン
  const relativeMatch = importPath.match(/\/features\/([^/]+)/);
  if (relativeMatch) return relativeMatch[1];

  return null;
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow direct imports between features",
      category: "Architecture",
      recommended: true,
    },
    schema: [],
    messages: {
      noCrossFeatureImport:
        "Feature '{{fromFeature}}' cannot import from feature '{{toFeature}}'. Compose features at app layer. See: feature/10-feature-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // features/ 内のファイルのみ対象
    if (!filename.includes("/features/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.") || filename.includes(".spec.")) {
      return {};
    }

    const fromFeature = getFeatureName(filename);
    if (!fromFeature) return {};

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const toFeature = getImportFeatureName(importPath);

        if (!toFeature) return;

        // 同一feature内のインポートは許可
        if (fromFeature === toFeature) return;

        // 異なるfeatureへのインポートは禁止
        context.report({
          node,
          messageId: "noCrossFeatureImport",
          data: {
            fromFeature,
            toFeature,
          },
        });
      },
    };
  },
};
