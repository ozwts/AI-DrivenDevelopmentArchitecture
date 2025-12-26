/**
 * コード生成実行（Code Generator）
 *
 * OpenAPI型生成、モック生成などのコード生成を実行
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 生成タイプ
 */
export type GenerateType = "api-types" | "mock" | "all";

/**
 * ワークスペース種別
 */
export type GenerateWorkspace = "server" | "web";

/**
 * 生成結果
 */
export type GenerateResult = {
  success: boolean;
  workspace: GenerateWorkspace;
  generateType: GenerateType;
  output: string;
  duration: number;
};

/**
 * 生成入力
 */
export type GenerateInput = {
  workspace: GenerateWorkspace;
  generateType: GenerateType;
  projectRoot: string;
};

/**
 * コード生成を実行
 */
export const executeGenerate = async (
  input: GenerateInput,
): Promise<GenerateResult> => {
  const { workspace, generateType, projectRoot } = input;
  const startTime = Date.now();

  const workspaceRoot = `${projectRoot}/../${workspace}`;

  let output = "";

  try {
    // API型生成
    if (generateType === "api-types" || generateType === "all") {
      try {
        const { stdout } = await execAsync("npm run generate:types", {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });
        output += `## API型生成\n${stdout !== "" ? stdout : "型生成が完了しました。"}\n\n`;
      } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string };
        let errorOutput = "generate:types スクリプトが見つかりません。";
        if (execError.stderr !== undefined && execError.stderr !== "") {
          errorOutput = execError.stderr;
        }
        output += `## API型生成\n${errorOutput}\n\n`;
      }
    }

    // モック生成
    if (generateType === "mock" || generateType === "all") {
      try {
        const { stdout } = await execAsync("npm run generate:mock", {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 10,
        });
        output += `## モック生成\n${stdout !== "" ? stdout : "モック生成が完了しました。"}\n\n`;
      } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string };
        let errorOutput = "generate:mock スクリプトが見つかりません。";
        if (execError.stderr !== undefined && execError.stderr !== "") {
          errorOutput = execError.stderr;
        }
        output += `## モック生成\n${errorOutput}\n\n`;
      }
    }

    return {
      success: true,
      workspace,
      generateType,
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      workspace,
      generateType,
      output: `Error: ${errorMessage}`,
      duration: Date.now() - startTime,
    };
  }
};
