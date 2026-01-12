/**
 * インフラ静的解析ハンドラー
 */

import * as path from "path";
import {
  InfraAnalysisType,
  executeInfraAnalysis,
  InfraAnalysisResult,
} from "./reviewer";
import { formatInfraAnalysisResults } from "./formatter";

/**
 * インフラ静的解析ハンドラー入力
 */
export type InfraAnalysisHandlerInput = {
  targetDirectory: string;
  guardrailsRoot: string;
  analysisType?: InfraAnalysisType;
  deepCheck?: boolean;
};

/**
 * インフラ静的解析ハンドラー
 */
export const createInfraAnalysisHandler =
  () =>
  async (args: InfraAnalysisHandlerInput): Promise<string> => {
    const { targetDirectory, guardrailsRoot, analysisType = "all", deepCheck = false } = args;

    // バリデーション
    if (
      targetDirectory === null ||
      targetDirectory === undefined ||
      typeof targetDirectory !== "string" ||
      targetDirectory === ""
    ) {
      throw new Error("targetDirectoryは必須です");
    }

    if (
      guardrailsRoot === null ||
      guardrailsRoot === undefined ||
      typeof guardrailsRoot !== "string" ||
      guardrailsRoot === ""
    ) {
      throw new Error("guardrailsRootは必須です");
    }

    // Terraformルートを決定
    const terraformRoot = path.join(guardrailsRoot, "..", "infra", "terraform");

    // インフラ静的解析実行
    const analysisResult: InfraAnalysisResult = await executeInfraAnalysis({
      targetDirectory,
      analysisType,
      terraformRoot,
      deepCheck,
    });

    // 結果整形
    return formatInfraAnalysisResults(analysisResult, targetDirectory);
  };
