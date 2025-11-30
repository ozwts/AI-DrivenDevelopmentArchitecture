/**
 * 静的解析ハンドラー
 */

import * as path from "path";
import fg from "fast-glob";
import {
  StaticAnalysisType,
  executeStaticAnalysis,
  StaticAnalysisResult,
} from "./static-analysis-reviewer";
import { formatStaticAnalysisResults } from "./formatter";

/**
 * ワークスペース種別
 */
export type Workspace = "server" | "web";

/**
 * 静的解析ハンドラー入力
 */
export type StaticAnalysisHandlerInput = {
  workspace: Workspace;
  targetDirectories: string[];
  guardrailsRoot: string;
  analysisType?: StaticAnalysisType;
};

/**
 * 静的解析ハンドラー
 */
export const createStaticAnalysisHandler =
  () =>
  async (args: StaticAnalysisHandlerInput): Promise<string> => {
    const {
      workspace,
      targetDirectories,
      guardrailsRoot,
      analysisType = "both",
    } = args;

    // バリデーション
    if (
      workspace === null ||
      workspace === undefined ||
      typeof workspace !== "string"
    ) {
      throw new Error("workspaceは必須です");
    }

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

    // workspaceに基づいてprojectRootを決定
    const projectRoot = path.join(guardrailsRoot, "..", workspace);

    // targetDirectoriesから対象ファイルパスを収集
    const fileSearchPromises = targetDirectories.map((dir) =>
      // TypeScript/JavaScriptファイルを再帰的に検索
      fg("**/*.{ts,tsx,js,jsx}", {
        cwd: dir,
        absolute: true,
        ignore: ["**/node_modules/**", "**/*.test.{ts,tsx,js,jsx}", "**/*.spec.{ts,tsx,js,jsx}"],
      }),
    );
    const fileArrays = await Promise.all(fileSearchPromises);
    const targetFilePaths = fileArrays.flat();

    // 静的解析実行
    const analysisResult: StaticAnalysisResult = await executeStaticAnalysis({
      targetFilePaths,
      analysisType,
      projectRoot,
    });

    // 結果整形
    return formatStaticAnalysisResults(analysisResult, targetFilePaths);
  };
