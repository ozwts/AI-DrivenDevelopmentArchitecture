/**
 * ポリシースキャナー
 */

import * as path from "path";
import * as fs from "fs";
import type { WorkspaceInfo, LayerInfo, CheckInfo } from "./responsibilities";

/**
 * ファイルからJSDocの@what説明を抽出
 */
const extractDescriptionFromFile = (filePath: string): string => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const match = content.match(/@what\s+(.+)/);
    return match !== null ? match[1].trim() : "";
  } catch {
    return "";
  }
};

/**
 * 指定されたディレクトリをスキャンしてワークスペース・レイヤー・チェック情報を取得
 */
const scanPolicyDirectory = (basePolicyDir: string): WorkspaceInfo[] => {
  if (!fs.existsSync(basePolicyDir)) {
    return [];
  }

  const workspaces: WorkspaceInfo[] = [];

  // ワークスペース一覧（server, web, infra）
  const workspaceDirs = fs.readdirSync(basePolicyDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const workspace of workspaceDirs) {
    const workspaceDir = path.join(basePolicyDir, workspace);
    const layers: LayerInfo[] = [];

    // レイヤー一覧
    const layerDirs = fs.readdirSync(workspaceDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    for (const layer of layerDirs) {
      const layerDir = path.join(workspaceDir, layer);
      const checks: CheckInfo[] = [];

      // チェックファイル一覧
      const files = fs.readdirSync(layerDir)
        .filter((file) => file.endsWith(".ts") && file !== "index.ts" && !file.endsWith(".d.ts"));

      for (const file of files) {
        const filePath = path.join(layerDir, file);
        const checkId = path.basename(file, ".ts");

        // JSDocから説明を抽出
        const description = extractDescriptionFromFile(filePath);

        checks.push({
          id: checkId,
          file,
          description,
        });
      }

      if (checks.length > 0) {
        layers.push({
          layer,
          checks,
        });
      }
    }

    if (layers.length > 0) {
      workspaces.push({
        workspace,
        layers,
      });
    }
  }

  return workspaces;
};

/**
 * horizontal をスキャン (.tsファイル)
 */
export const scanHorizontalStatic = (guardrailsRoot: string): WorkspaceInfo[] => {
  const basePolicyDir = path.join(guardrailsRoot, "policy/horizontal");
  return scanPolicyDirectory(basePolicyDir);
};

/**
 * horizontal semantic をスキャン
 */
export const scanHorizontalSemantic = (guardrailsRoot: string): WorkspaceInfo[] => {
  const basePolicyDir = path.join(guardrailsRoot, "policy/horizontal/generated/semantic");
  return scanPolicyDirectory(basePolicyDir);
};

/**
 * vertical をスキャン (.mdファイル)
 */
export const scanVerticalSemantic = (guardrailsRoot: string): WorkspaceInfo[] => {
  const basePolicyDir = path.join(guardrailsRoot, "policy/vertical");
  return scanPolicyDirectory(basePolicyDir);
};
