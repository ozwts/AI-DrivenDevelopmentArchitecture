/**
 * レビュー責務定義
 *
 * meta.jsonから動的にスキャンした結果を基にレビュー責務を生成する
 */

import { z } from "zod";
import { ReviewResponsibility } from "./review-handler";
import { scanAllPolicies, ScannedPolicy } from "./policy-scanner";

/**
 * 静的解析責務定義
 */
export type StaticAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodArray<z.ZodString>;
    analysisType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["type-check", "lint", "both"]>>
    >;
  };
};

/**
 * 未使用export検出責務定義
 */
export type UnusedExportsResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetDirectories: z.ZodOptional<z.ZodArray<z.ZodString>>;
  };
};

/**
 * ScannedPolicyからReviewResponsibilityを生成する
 */
const toReviewResponsibility = (
  policy: ScannedPolicy,
): ReviewResponsibility => ({
  id: `review_${policy.id.replace(/-/g, "_")}`,
  title: `${policy.meta.label}レビュー`,
  policyDir: policy.policyDir,
  responsibility: `${policy.meta.label} (${policy.id})`,
  toolDescription: `指定したディレクトリ配下のファイルが${policy.meta.label}ポリシーに準拠しているかを審査します。${policy.meta.description}`,
  inputSchema: {
    targetDirectories: z
      .array(z.string())
      .describe("レビュー対象ディレクトリの絶対パスの配列"),
  },
  dependencies: policy.meta.dependencies,
});

/**
 * レビュー責務を動的に生成する
 *
 * meta.jsonを持つすべてのポリシーがMCPツールとして公開される
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns レビュー責務一覧
 */
export const buildReviewResponsibilities = (
  guardrailsRoot: string,
): ReviewResponsibility[] => {
  const allPolicies = scanAllPolicies(guardrailsRoot);

  return [
    ...allPolicies.server,
    ...allPolicies.web,
    ...allPolicies.contract,
  ].map(toReviewResponsibility);
};

/**
 * 静的解析責務定義
 */
export const STATIC_ANALYSIS_RESPONSIBILITIES: StaticAnalysisResponsibility[] =
  [
    {
      id: "review_static_analysis",
      toolDescription:
        "指定されたワークスペースの静的解析を実行します。TypeScript型チェック（tsc --noEmit）、ESLint（eslint --format json）、または両方を選択できます。型チェックはプロジェクト全体、Lintは指定ディレクトリ配下のファイルをチェックします。",
      inputSchema: {
        workspace: z
          .enum(["server", "web"])
          .describe(
            "静的解析を実行するワークスペース: 'server'（サーバー側）、'web'（フロントエンド側）",
          ),
        targetDirectories: z
          .array(z.string())
          .describe(
            "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/domain/model']）",
          ),
        analysisType: z
          .enum(["type-check", "lint", "both"])
          .optional()
          .default("both")
          .describe(
            "実行する解析タイプ: 'type-check'（型チェックのみ）、'lint'（Lintのみ）、'both'（両方）。デフォルトは 'both'。",
          ),
      },
    },
  ];

/**
 * 未使用export検出責務定義
 */
export const UNUSED_EXPORTS_RESPONSIBILITIES: UnusedExportsResponsibility[] = [
  {
    id: "review_unused_exports",
    toolDescription:
      "指定されたワークスペースの未使用exportを検出します。knipを使用してexportされているが使用されていない関数・型・変数を検出します。",
    inputSchema: {
      workspace: z
        .enum(["server", "web"])
        .describe(
          "検出を実行するワークスペース: 'server'（サーバー側）、'web'（フロントエンド側）",
        ),
      targetDirectories: z
        .array(z.string())
        .optional()
        .describe(
          "フィルタ対象ディレクトリの絶対パスの配列（省略時は全ファイル対象）",
        ),
    },
  },
];
