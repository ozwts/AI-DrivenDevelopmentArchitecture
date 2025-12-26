/**
 * 定性的レビュー責務定義
 *
 * meta.jsonから動的にスキャンした結果を基にレビュー責務を生成する
 */

import { z } from "zod";
import { scanAllPolicies, ScannedPolicy } from "./policy-scanner";

/**
 * 定性的レビュー責務定義
 */
export type ReviewResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** レビュータイトル */
  title: string;
  /** ポリシーディレクトリ（guardrailsRoot からの相対パス） */
  policyDir: string;
  /** レビュー責務（例: "ドメインモデル (Domain Model)"） */
  responsibility: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    targetDirectories: z.ZodArray<z.ZodString>;
  };
  /** 依存ポリシーID一覧（オプション） */
  dependencies?: string[];
};

/**
 * ScannedPolicyからReviewResponsibilityを生成する
 */
const toReviewResponsibility = (
  policy: ScannedPolicy,
): ReviewResponsibility => ({
  id: `review_${policy.category}_${policy.id.replace(/-/g, "_")}`,
  title: `${policy.meta.label} Review`,
  policyDir: policy.policyDir,
  responsibility: `${policy.meta.label} (${policy.category}/${policy.id})`,
  toolDescription: `Reviews files under the specified directories for ${policy.meta.label} policy compliance. ${policy.meta.description}`,
  inputSchema: {
    targetDirectories: z
      .array(z.string())
      .describe("Array of absolute paths of target directories to review"),
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
