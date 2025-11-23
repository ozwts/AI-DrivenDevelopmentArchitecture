/**
 * ファイル種別からレビューに使用するポリシーファイルを選択
 */

import * as path from "path";
import * as fs from "fs/promises";

export interface PolicySelection {
  policyFiles: string[];
}

/**
 * ファイルパスから適切なポリシーファイルのリストを取得
 * @param targetFilePath レビュー対象のファイルパス
 * @param guardrailsRoot guardrailsディレクトリのルートパス
 * @returns 選択されたポリシーファイルのパスリスト
 */
export async function selectPolicies(
  targetFilePath: string,
  guardrailsRoot: string
): Promise<PolicySelection> {
  const fileName = path.basename(targetFilePath);
  const isComponentTest = fileName.endsWith(".ct.test.tsx");
  const isSnapshotTest = fileName.endsWith(".ss.test.ts");

  // ポリシーディレクトリのベースパス
  const policyBase = path.join(guardrailsRoot, "policy", "web", "test-strategy");

  let policyFiles: string[] = [];

  if (isComponentTest) {
    // コンポーネントテスト: 全体像 + コンポーネントテスト
    policyFiles = [
      path.join(policyBase, "10-test-strategy-overview.md"),
      path.join(policyBase, "20-component-test.md"),
    ];
  } else if (isSnapshotTest) {
    // スナップショットテスト: 全体像 + スナップショットテスト
    policyFiles = [
      path.join(policyBase, "10-test-strategy-overview.md"),
      path.join(policyBase, "30-snapshot-test.md"),
    ];
  } else {
    throw new Error(`サポートされていないファイル形式です: ${fileName}`);
  }

  // 全てのポリシーファイルが存在するか確認
  await Promise.all(
    policyFiles.map(async (file) => {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`ポリシーファイルが見つかりません: ${file}`);
      }
    })
  );

  return { policyFiles };
}

/**
 * ポリシーファイルを並列で読み込む
 */
export async function loadPolicies(policyFiles: string[]): Promise<string[]> {
  return Promise.all(
    policyFiles.map(async (file) => {
      const content = await fs.readFile(file, "utf-8");
      return `# Policy: ${path.basename(file)}\n\n${content}`;
    })
  );
}
