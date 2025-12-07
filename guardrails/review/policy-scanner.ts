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
 * スキャン結果
 */
export type ScannedPolicy = {
  /** ポリシーID（ディレクトリ名） */
  id: string;
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
 * @returns スキャンされたポリシー一覧
 */
export const scanPolicies = (
  basePath: string,
  relativeTo: string
): ScannedPolicy[] => {
  const policies: ScannedPolicy[] = [];

  if (!fs.existsSync(basePath)) {
    return policies;
  }

  const entries = fs.readdirSync(basePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dirPath = path.join(basePath, entry.name);
    const metaPath = path.join(dirPath, "meta.json");

    if (!fs.existsSync(metaPath)) {
      continue;
    }

    try {
      const metaContent = fs.readFileSync(metaPath, "utf-8");
      const meta: PolicyMeta = JSON.parse(metaContent);

      policies.push({
        id: entry.name,
        policyDir: path.relative(relativeTo, dirPath),
        absolutePath: dirPath,
        meta,
      });
    } catch (error) {
      console.warn(`Failed to parse meta.json at ${metaPath}:`, error);
    }
  }

  return policies;
};

/**
 * サーバー側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanServerPolicies = (
  guardrailsRoot: string
): ScannedPolicy[] => {
  const serverPolicyPath = path.join(guardrailsRoot, "policy", "server");
  return scanPolicies(serverPolicyPath, guardrailsRoot);
};

/**
 * Web側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanWebPolicies = (guardrailsRoot: string): ScannedPolicy[] => {
  const webPolicyPath = path.join(guardrailsRoot, "policy", "web");
  return scanPolicies(webPolicyPath, guardrailsRoot);
};

/**
 * Contract側ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns スキャンされたポリシー一覧
 */
export const scanContractPolicies = (
  guardrailsRoot: string
): ScannedPolicy[] => {
  const contractPolicyPath = path.join(guardrailsRoot, "policy", "contract");
  return scanPolicies(contractPolicyPath, guardrailsRoot);
};

/**
 * 全ポリシーをスキャンする
 *
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns カテゴリ別のスキャンされたポリシー
 */
export const scanAllPolicies = (
  guardrailsRoot: string
): {
  server: ScannedPolicy[];
  web: ScannedPolicy[];
  contract: ScannedPolicy[];
} => {
  return {
    server: scanServerPolicies(guardrailsRoot),
    web: scanWebPolicies(guardrailsRoot),
    contract: scanContractPolicies(guardrailsRoot),
  };
};
