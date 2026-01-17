/**
 * カスタム静的解析ハンドラー（TypeScript Compiler API）
 */

import * as path from "path";
import { runStaticAnalysisV2 } from "./index";
import { formatViolations } from "./formatter";

/**
 * ワークスペース種別
 */
export type CustomWorkspace = "server" | "web" | "infra";

/**
 * カスタム静的解析ハンドラー入力
 */
export type CustomStaticAnalysisHandlerInput = {
  workspace?: CustomWorkspace;
  layer?: string;
  targetDirectories: string[];
  guardrailsRoot: string;
};

/**
 * カスタム静的解析ハンドラー
 */
export const createCustomStaticAnalysisHandler =
  () =>
  async (args: CustomStaticAnalysisHandlerInput): Promise<string> => {
    const { workspace, layer, targetDirectories, guardrailsRoot } = args;

    // バリデーション
    if (
      targetDirectories === null ||
      targetDirectories === undefined ||
      !Array.isArray(targetDirectories)
    ) {
      throw new Error("targetDirectoriesは配列である必要があります");
    }

    if (
      guardrailsRoot === null ||
      guardrailsRoot === undefined ||
      typeof guardrailsRoot !== "string" ||
      guardrailsRoot === ""
    ) {
      throw new Error("guardrailsRootは必須です");
    }

    // カスタム静的解析実行
    const violations = await runStaticAnalysisV2(
      workspace,
      layer,
      targetDirectories
    );

    // 結果整形
    return formatViolations(violations);
  };
