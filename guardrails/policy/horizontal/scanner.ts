/**
 * ポリシースキャナー
 */

import * as path from 'path';
import * as fs from 'fs';

/**
 * チェック情報
 */
export interface CheckInfo {
  id: string;
  file: string;
  description: string;
}

/**
 * レイヤー情報
 */
export interface LayerInfo {
  layer: string;
  checks: CheckInfo[];
}

/**
 * ワークスペース情報
 */
export interface WorkspaceInfo {
  workspace: string;
  layers: LayerInfo[];
}

/**
 * horizontal static をスキャン
 */
export function scanHorizontalStatic(guardrailsRoot: string): WorkspaceInfo[] {
  const basePolicyDir = path.join(guardrailsRoot, 'policy/horizontal/static');
  return scanPolicyDirectory(basePolicyDir);
}

/**
 * horizontal semantic をスキャン
 */
export function scanHorizontalSemantic(guardrailsRoot: string): WorkspaceInfo[] {
  const basePolicyDir = path.join(guardrailsRoot, 'policy/horizontal/generated/semantic');
  return scanPolicyDirectory(basePolicyDir);
}

/**
 * vertical semantic をスキャン
 */
export function scanVerticalSemantic(guardrailsRoot: string): WorkspaceInfo[] {
  const basePolicyDir = path.join(guardrailsRoot, 'policy/vertical/semantic');
  return scanPolicyDirectory(basePolicyDir);
}

/**
 * 指定されたディレクトリをスキャンしてワークスペース・レイヤー・チェック情報を取得
 */
function scanPolicyDirectory(basePolicyDir: string): WorkspaceInfo[] {
  if (!fs.existsSync(basePolicyDir)) {
    return [];
  }

  const workspaces: WorkspaceInfo[] = [];

  // ワークスペース一覧（server, web, infra）
  const workspaceDirs = fs.readdirSync(basePolicyDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  for (const workspace of workspaceDirs) {
    const workspaceDir = path.join(basePolicyDir, workspace);
    const layers: LayerInfo[] = [];

    // レイヤー一覧
    const layerDirs = fs.readdirSync(workspaceDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const layer of layerDirs) {
      const layerDir = path.join(workspaceDir, layer);
      const checks: CheckInfo[] = [];

      // チェックファイル一覧
      const files = fs.readdirSync(layerDir)
        .filter(file => file.endsWith('.ts') && file !== 'index.ts' && !file.endsWith('.d.ts'));

      for (const file of files) {
        const filePath = path.join(layerDir, file);
        const checkId = path.basename(file, '.ts');

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
}

/**
 * ファイルからJSDocの@what説明を抽出
 */
function extractDescriptionFromFile(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/@what\s+(.+)/);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}
