/**
 * 未使用export検出ハンドラー
 */

import * as path from "path";
import {
  executeUnusedExportsCheck,
  UnusedExportsResult,
} from "./reviewer";
import { formatUnusedExportsResults } from "./formatter";

/**
 * ワークスペース種別
 */
export type Workspace = "server" | "web";

/**
 * 未使用export検出ハンドラー入力
 */
export type UnusedExportsHandlerInput = {
  workspace: Workspace;
  targetDirectories?: string[];
  guardrailsRoot: string;
};

/**
 * 未使用export検出ハンドラー
 */
export const createUnusedExportsHandler =
  () =>
  async (args: UnusedExportsHandlerInput): Promise<string> => {
    const { workspace, targetDirectories, guardrailsRoot } = args;

    // バリデーション
    if (
      workspace === null ||
      workspace === undefined ||
      typeof workspace !== "string"
    ) {
      throw new Error("workspaceは必須です");
    }

    if (
      guardrailsRoot === null ||
      guardrailsRoot === undefined ||
      typeof guardrailsRoot !== "string" ||
      guardrailsRoot === ""
    ) {
      throw new Error("guardrailsRootは必須です");
    }

    // workspaceに基づいてprojectRootを決定
    const projectRoot = path.join(guardrailsRoot, "..", workspace);

    // 未使用export検出実行
    const result: UnusedExportsResult = await executeUnusedExportsCheck({
      targetDirectories,
      projectRoot,
    });

    // 結果整形
    return formatUnusedExportsResults(result, targetDirectories ?? []);
  };
