/**
 * コード生成実行（Code Generator）
 *
 * npm scripts経由でOpenAPI型生成を実行
 * ワークスペース単位での生成を行う
 *
 * 注意: 各ワークスペースのcodegenスクリプトは内部でcodegen:bundleを先に実行するため、
 * どのワークスペースを指定しても常にOpenAPI結合が行われる
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * ワークスペース種別
 */
export type GenerateWorkspace = "server" | "web" | "all";

/**
 * 生成結果
 */
export type GenerateResult = {
  success: boolean;
  workspace: GenerateWorkspace;
  output: string;
  duration: number;
};

/**
 * 生成入力
 */
export type GenerateInput = {
  workspace: GenerateWorkspace;
  projectRoot: string;
};

/**
 * コード生成を実行（npm scripts経由）
 *
 * 利用するnpm scripts:
 * - all: npm run codegen（bundle + server + web）
 * - server: npm run codegen -w server（内部でbundle実行）
 * - web: npm run codegen -w web（内部でbundle実行）
 */
export const executeGenerate = async (
  input: GenerateInput,
): Promise<GenerateResult> => {
  const { workspace, projectRoot } = input;
  const startTime = Date.now();

  try {
    // all: ルートのcodegen、server/web: ワークスペース単位のcodegen
    const command =
      workspace === "all"
        ? "npm run codegen"
        : `npm run codegen -w ${workspace}`;

    const { stdout } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 10,
    });

    const output = `## コード生成 (${workspace})\n${stdout !== "" ? stdout : "コード生成が完了しました。"}\n`;

    return {
      success: true,
      workspace,
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const execError = error as { stdout?: string; stderr?: string };
    let errorOutput = "コード生成中にエラーが発生しました。";
    if (execError.stderr !== undefined && execError.stderr !== "") {
      errorOutput = execError.stderr;
    } else if (execError.stdout !== undefined && execError.stdout !== "") {
      errorOutput = execError.stdout;
    } else if (error instanceof Error) {
      errorOutput = error.message;
    }

    return {
      success: false,
      workspace,
      output: `Error: ${errorOutput}`,
      duration: Date.now() - startTime,
    };
  }
};
