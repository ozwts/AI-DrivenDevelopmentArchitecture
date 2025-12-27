/**
 * ポリシースキャナー
 *
 * policy/ディレクトリ配下のmeta.jsonを動的にスキャンし、
 * レビュー責務定義を自動生成する
 */

import * as fs from "fs";
import * as path from "path";

/**
 * meta.jsonのスキーマ
 */
export type PolicyMeta = {
  /** 表示ラベル */
  label: string;
  /** 説明文 */
  description: string;
  /** 依存するポリシーID（オプション） */
  dependencies?: string[];
};

/**
 * ポリシーカテゴリ
 */
export type PolicyCategory = "server" | "web" | "contract" | "e2e" | "infra";

/**
 * スキャン結果
 */
export type ScannedPolicy = {
  /** ポリシーID（ディレクトリ名） */
  id: string;
  /** ポリシーカテゴリ */
  category: PolicyCategory;
  /** ポリシーディレクトリの相対パス（guardrails/からの相対） */
  policyDir: string;
  /** ポリシーディレクトリの絶対パス */
  absolutePath: string;
  /** meta.jsonの内容 */
  meta: PolicyMeta;
};

/**
 * 指定ディレクトリ配下のmeta.jsonをスキャンする
 *
 * @param basePath スキャン対象のベースパス（例: guardrails/policy/server）
 * @param relativeTo 相対パスの起点（例: guardrails/）
 * @param category ポリシーカテゴリ
 * @returns スキャンされたポリシー一覧
 */
export const scanPolicies = (
  basePath: string,
  relativeTo: string,
  category: PolicyCategory,
): ScannedPolicy[] => {
  if (!fs.existsSync(basePath)) {
    return [];
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dirPath = path.join(basePath, entry.name);
      const metaPath = path.join(dirPath, "meta.json");

      if (!fs.existsSync(metaPath)) {
        return [];
      }

      try {
        const metaContent = fs.readFileSync(metaPath, "utf-8");
        const meta: PolicyMeta = JSON.parse(metaContent);

        return [
          {
            id: entry.name,
            category,
            policyDir: path.relative(relativeTo, dirPath),
            absolutePath: dirPath,
            meta,
          },
        ];
      } catch {
        // meta.jsonのパースに失敗した場合はスキップ
        return [];
      }
    });
};

/**
 * サーバー側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanServerPolicies = (guardrailsRoot: string): ScannedPolicy[] => {
  const serverPolicyPath = path.join(guardrailsRoot, "policy", "server");
  return scanPolicies(serverPolicyPath, guardrailsRoot, "server");
};

/**
 * Web側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanWebPolicies = (guardrailsRoot: string): ScannedPolicy[] => {
  const webPolicyPath = path.join(guardrailsRoot, "policy", "web");
  return scanPolicies(webPolicyPath, guardrailsRoot, "web");
};

/**
 * Contract側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanContractPolicies = (
  guardrailsRoot: string,
): ScannedPolicy[] => {
  const contractPolicyPath = path.join(guardrailsRoot, "policy", "contract");
  return scanPolicies(contractPolicyPath, guardrailsRoot, "contract");
};

/**
 * E2E側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanE2ePolicies = (guardrailsRoot: string): ScannedPolicy[] => {
  const e2ePolicyPath = path.join(guardrailsRoot, "policy", "e2e");
  return scanPolicies(e2ePolicyPath, guardrailsRoot, "e2e");
};

/**
 * Infra側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanInfraPolicies = (guardrailsRoot: string): ScannedPolicy[] => {
  const infraPolicyPath = path.join(guardrailsRoot, "policy", "infra");
  return scanPolicies(infraPolicyPath, guardrailsRoot, "infra");
};

/**
 * 全ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns カテゴリ別のスキャンされたポリシー
 */
export const scanAllPolicies = (
  guardrailsRoot: string,
): {
  server: ScannedPolicy[];
  web: ScannedPolicy[];
  contract: ScannedPolicy[];
  e2e: ScannedPolicy[];
  infra: ScannedPolicy[];
} => ({
  server: scanServerPolicies(guardrailsRoot),
  web: scanWebPolicies(guardrailsRoot),
  contract: scanContractPolicies(guardrailsRoot),
  e2e: scanE2ePolicies(guardrailsRoot),
  infra: scanInfraPolicies(guardrailsRoot),
});
