/**
 * 定性的レビュー責務定義
 *
 * meta.jsonから動的にスキャンした結果を基に
 * 単一の統合レビューツールを生成する
 */

import { z } from "zod";
import { scanAllPolicies, ScannedPolicy } from "./policy-scanner";

/**
 * ポリシー定義
 */
export type PolicyDefinition = {
  /** ポリシーID（例: "server/domain-model"） */
  id: string;
  /** ポリシーディレクトリ（guardrailsRoot からの相対パス） */
  policyDir: string;
  /** 表示ラベル */
  label: string;
  /** 説明 */
  description: string;
  /** 依存ポリシーID一覧 */
  dependencies?: string[];
};

/**
 * 統合レビューツールの責務定義
 */
export type UnifiedReviewResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: {
    policyId: z.ZodString;
    targetDirectories: z.ZodArray<z.ZodString>;
  };
  policies: Map<string, PolicyDefinition>;
};

const toPolicyDefinition = (policy: ScannedPolicy): PolicyDefinition => ({
  id: `${policy.category}/${policy.id}`,
  policyDir: policy.policyDir,
  label: policy.meta.label,
  description: policy.meta.description,
  dependencies: policy.meta.dependencies,
});

const buildCatalog = (
  policies: PolicyDefinition[],
  label: string,
): string => {
  if (policies.length === 0) return "";
  const lines = policies.map((p) => `  - ${p.id}: ${p.label} - ${p.description}`);
  return `\n${label}:\n${lines.join("\n")}`;
};

/**
 * 統合レビューツールの責務を動的に生成
 */
export const buildUnifiedReviewResponsibility = (
  guardrailsRoot: string,
): UnifiedReviewResponsibility => {
  const all = scanAllPolicies(guardrailsRoot);

  const server = all.server.map(toPolicyDefinition);
  const web = all.web.map(toPolicyDefinition);
  const contract = all.contract.map(toPolicyDefinition);
  const e2e = all.e2e.map(toPolicyDefinition);
  const infra = all.infra.map(toPolicyDefinition);

  const policies = new Map<string, PolicyDefinition>();
  for (const p of [...server, ...web, ...contract, ...e2e, ...infra]) {
    policies.set(p.id, p);
  }

  const catalog = [
    buildCatalog(server, "Server"),
    buildCatalog(web, "Web"),
    buildCatalog(contract, "Contract"),
    buildCatalog(e2e, "E2E"),
    buildCatalog(infra, "Infra"),
  ]
    .filter((s) => s.length > 0)
    .join("\n");

  return {
    id: "review_qualitative",
    toolDescription: `Reviews files for policy compliance.
${catalog}

Usage: policyId="server/domain-model", targetDirectories=["/path/to/src"]`,
    inputSchema: {
      policyId: z.string().describe('Policy ID (e.g., "server/domain-model")'),
      targetDirectories: z
        .array(z.string())
        .describe("Target directories to review"),
    },
    policies,
  };
};
