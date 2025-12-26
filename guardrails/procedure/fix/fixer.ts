/**
 * 自動修正実行（Auto Fixer）
 *
 * ESLint --fix、Prettier、terraform fmtなどの自動修正を実行
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 修正タイプ
 */
export type FixType = "lint" | "format" | "all";

/**
 * ワークスペース種別
 */
export type FixWorkspace = "server" | "web" | "infra";

/**
 * 修正結果
 */
export type FixResult = {
  success: boolean;
  workspace: FixWorkspace;
  fixType: FixType;
  output: string;
  duration: number;
};

/**
 * 修正入力
 */
export type FixInput = {
  workspace: FixWorkspace;
  fixType: FixType;
  targetPath?: string;
  projectRoot: string;
};

/**
 * 自動修正を実行
 */
export const executeFix = async (input: FixInput): Promise<FixResult> => {
  const { workspace, fixType, targetPath, projectRoot } = input;
  const startTime = Date.now();

  const workspaceRoot =
    workspace === "infra"
      ? `${projectRoot}/../infra/terraform`
      : `${projectRoot}/../${workspace}`;

  const target = targetPath !== undefined && targetPath !== "" ? targetPath : ".";

  let output = "";

  try {
    // Lint fix
    if (fixType === "lint" || fixType === "all") {
      if (workspace === "infra") {
        // terraform fmt
        const { stdout: fmtOut } = await execAsync(
          `terraform fmt -recursive "${target}"`,
          { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 10 },
        );
        output += `## terraform fmt\n${fmtOut !== "" ? fmtOut : "All files formatted."}\n\n`;
      } else {
        // ESLint --fix
        try {
          const { stdout: lintOut } = await execAsync(
            `npx eslint --fix "${target}"`,
            { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 10 },
          );
          output += `## ESLint --fix\n${lintOut !== "" ? lintOut : "No issues to fix."}\n\n`;
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string };
          let errorOutput = "ESLint fix completed with warnings.";
          if (execError.stdout !== undefined && execError.stdout !== "") {
            errorOutput = execError.stdout;
          } else if (execError.stderr !== undefined && execError.stderr !== "") {
            errorOutput = execError.stderr;
          }
          output += `## ESLint --fix\n${errorOutput}\n\n`;
        }
      }
    }

    // Format (Prettier for web/server, terraform fmt for infra)
    if (fixType === "format" || fixType === "all") {
      if (workspace === "infra") {
        // Already handled by terraform fmt above
        if (fixType === "format") {
          const { stdout: fmtOut } = await execAsync(
            `terraform fmt -recursive "${target}"`,
            { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 10 },
          );
          output += `## terraform fmt\n${fmtOut !== "" ? fmtOut : "All files formatted."}\n\n`;
        }
      } else {
        // Prettier (if available)
        try {
          const { stdout: prettierOut } = await execAsync(
            `npx prettier --write "${target}"`,
            { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 10 },
          );
          output += `## Prettier\n${prettierOut !== "" ? prettierOut : "All files formatted."}\n\n`;
        } catch {
          output += "## Prettier\nPrettier not configured or no files to format.\n\n";
        }
      }
    }

    return {
      success: true,
      workspace,
      fixType,
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      workspace,
      fixType,
      output: `Error: ${errorMessage}`,
      duration: Date.now() - startTime,
    };
  }
};
