/**
 * 静的解析ハンドラー
 */

import * as path from "path";
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
  targetFilePaths: string[];
  guardrailsRoot: string;
  analysisType?: StaticAnalysisType;
};

/**
 * 静的解析ハンドラー
 */
export const createStaticAnalysisHandler = () =>
  async (args: StaticAnalysisHandlerInput): Promise<string> => {
    const {
      workspace,
      targetFilePaths,
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
      targetFilePaths === null ||
      targetFilePaths === undefined ||
      !Array.isArray(targetFilePaths)
    ) {
      throw new Error("targetFilePathsは配列である必要があります");
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

    // 静的解析実行
    const analysisResult: StaticAnalysisResult = await executeStaticAnalysis({
      targetFilePaths,
      analysisType,
      projectRoot,
    });

    // 結果整形
    return formatStaticAnalysisResults(analysisResult, targetFilePaths);
  };
