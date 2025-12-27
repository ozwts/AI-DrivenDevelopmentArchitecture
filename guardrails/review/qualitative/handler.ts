/**
 * 定性的レビューハンドラー
 */

import * as path from "path";
import { executeReview, ReviewResult } from "./reviewer";
import { formatQualitativeReviewResults } from "./formatter";
import { UnifiedReviewResponsibility, PolicyDefinition } from "./responsibilities";

export type UnifiedReviewInput = {
  policyId: string;
  targetDirectories: string[];
  guardrailsRoot: string;
};

/**
 * 依存ポリシーのパスを解決
 */
const resolveDependencyPath = (
  dependencyId: string,
  currentPolicyDir: string,
): string => {
  const parentDir = path.dirname(currentPolicyDir);
  return path.join(parentDir, dependencyId);
};

/**
 * 統合レビューハンドラーを生成
 */
export const createUnifiedReviewHandler =
  (responsibility: UnifiedReviewResponsibility) =>
  async (args: UnifiedReviewInput): Promise<string> => {
    const { policyId, targetDirectories, guardrailsRoot } = args;

    // バリデーション
    if (policyId === "" || policyId === undefined || policyId === null) {
      throw new Error("policyId is required");
    }
    if (!Array.isArray(targetDirectories) || targetDirectories.length === 0) {
      throw new Error("targetDirectories must be a non-empty array");
    }

    // ポリシー検索
    const policy: PolicyDefinition | undefined =
      responsibility.policies.get(policyId);
    if (policy === undefined) {
      const available = Array.from(responsibility.policies.keys()).join(", ");
      throw new Error(
        `Unknown policyId: "${policyId}". Available: ${available}`,
      );
    }

    // パス構築
    const fullPolicyDir = path.join(guardrailsRoot, policy.policyDir);
    const dependencyPolicyDirs = policy.dependencies?.map((depId) =>
      resolveDependencyPath(depId, fullPolicyDir),
    );

    // レビュー実行
    const result: ReviewResult = await executeReview({
      targetDirectories,
      policyDir: fullPolicyDir,
      responsibility: `${policy.label} (${policyId})`,
      dependencyPolicyDirs,
    });

    return formatQualitativeReviewResults(result, `${policy.label} Review`);
  };
