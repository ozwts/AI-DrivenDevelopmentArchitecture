/**
 * 静的解析レビュー実装（Static Analysis Review）
 *
 * TypeScript型チェックとESLintによる静的解析。
 * 定性的レビュー（qualitative-reviewer.ts）とは独立した実装。
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

/**
 * 静的解析の種類
 */
export type StaticAnalysisType = "type-check" | "lint" | "both";

/**
 * 型チェック結果の詳細
 */
export type TypeCheckIssue = {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
};

/**
 * Lint結果の詳細
 */
export type LintIssue = {
  file: string;
  line: number;
  column: number;
  ruleId: string | null;
  message: string;
  severity: "warning" | "error";
};

/**
 * 静的解析結果
 */
export type StaticAnalysisResult = {
  /** 解析成功フラグ（エラーがない場合true） */
  success: boolean;
  /** 解析タイプ */
  analysisType: StaticAnalysisType;
  /** 型チェック結果 */
  typeCheck?: {
    passed: boolean;
    issues: TypeCheckIssue[];
    output: string;
  };
  /** Lint結果 */
  lint?: {
    passed: boolean;
    issues: LintIssue[];
    output: string;
  };
  /** エラーメッセージ（解析実行失敗時） */
  error?: string;
};

/**
 * 静的解析入力パラメータ
 */
export type StaticAnalysisInput = {
  /** 解析対象ディレクトリ一覧 */
  targetDirectories: string[];
  /** 解析タイプ */
  analysisType: StaticAnalysisType;
  /** プロジェクトルートディレクトリ */
  projectRoot: string;
};

/**
 * 静的解析を実行
 */
export const executeStaticAnalysis = async (
  input: StaticAnalysisInput,
): Promise<StaticAnalysisResult> => {
  const { targetDirectories, analysisType, projectRoot } = input;

  /**
   * ファイルパスが対象ディレクトリ内かどうかを判定
   */
  const isInTargetDirectories = (filePath: string): boolean => {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(projectRoot, filePath);
    return targetDirectories.some((dir) => absolutePath.startsWith(dir));
  };

  /**
   * TypeScript型チェックを実行（内部関数）
   */
  const runTypeCheck = async (): Promise<{
    passed: boolean;
    issues: TypeCheckIssue[];
    output: string;
  }> => {
    try {
      const { stdout, stderr } = await execAsync("npx tsc --noEmit", {
        cwd: projectRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });

      // tsc --noEmit はエラーがなければ exit code 0
      let outputValue: string;
      if (stdout !== null && stdout !== undefined && stdout !== "") {
        outputValue = stdout;
      } else if (stderr !== null && stderr !== undefined && stderr !== "") {
        outputValue = stderr;
      } else {
        outputValue = "No type errors found.";
      }

      return {
        passed: true,
        issues: [],
        output: outputValue,
      };
    } catch (error: unknown) {
      // エラーがある場合は exit code !== 0
      const execError = error as { stdout?: string; stderr?: string };
      const stdoutValue =
        execError.stdout !== null &&
        execError.stdout !== undefined &&
        execError.stdout !== ""
          ? execError.stdout
          : "";
      const stderrValue =
        execError.stderr !== null &&
        execError.stderr !== undefined &&
        execError.stderr !== ""
          ? execError.stderr
          : "";
      const output = stdoutValue !== "" ? stdoutValue : stderrValue;

      // tsc のエラー出力をパース
      // 形式: "path/to/file.ts(line,col): error TSxxxx: message"
      const allIssues: TypeCheckIssue[] = [];
      const lines = output.split("\n");

      for (const line of lines) {
        const match = line.match(
          /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/,
        );
        if (match !== null && match !== undefined) {
          allIssues.push({
            file: match[1],
            line: parseInt(match[2], 10),
            column: parseInt(match[3], 10),
            code: match[4],
            message: match[5],
          });
        }
      }

      // 対象ディレクトリ内のファイルのみをフィルタリング
      const issues = allIssues.filter((issue) =>
        isInTargetDirectories(issue.file),
      );

      return {
        passed: issues.length === 0,
        issues,
        output,
      };
    }
  };

  /**
   * ESLintを実行（内部関数）
   */
  const runLint = async (): Promise<{
    passed: boolean;
    issues: LintIssue[];
    output: string;
  }> => {
    // ディレクトリ指定なし（空配列）の場合はワークスペース全体を対象
    const lintTarget =
      targetDirectories.length === 0
        ? "."
        : targetDirectories
            .map((dir) => `"${path.relative(projectRoot, dir)}"`)
            .join(" ");

    try {
      const { stdout } = await execAsync(
        `npx eslint --format json ${lintTarget}`,
        {
          cwd: projectRoot,
          maxBuffer: 1024 * 1024 * 10, // 10MB
        },
      );

      // ESLint JSON出力をパース
      const results = JSON.parse(stdout) as {
        filePath: string;
        messages: {
          line: number;
          column: number;
          ruleId: string | null;
          message: string;
          severity: 1 | 2; // 1: warning, 2: error
        }[];
      }[];

      const issues: LintIssue[] = [];
      for (const result of results) {
        for (const msg of result.messages) {
          issues.push({
            file: result.filePath,
            line: msg.line,
            column: msg.column,
            ruleId: msg.ruleId,
            message: msg.message,
            severity: msg.severity === 2 ? "error" : "warning",
          });
        }
      }

      const passed =
        issues.filter((issue) => issue.severity === "error").length === 0;

      return {
        passed,
        issues,
        output: stdout,
      };
    } catch (error: unknown) {
      // ESLintエラーがある場合
      const execError = error as { stdout?: string; stderr?: string };
      const stdoutValue =
        execError.stdout !== null &&
        execError.stdout !== undefined &&
        execError.stdout !== ""
          ? execError.stdout
          : "";
      const stderrValue =
        execError.stderr !== null &&
        execError.stderr !== undefined &&
        execError.stderr !== ""
          ? execError.stderr
          : "";
      const output = stdoutValue !== "" ? stdoutValue : stderrValue;

      try {
        // JSON出力をパース
        const jsonStr =
          execError.stdout !== null &&
          execError.stdout !== undefined &&
          execError.stdout !== ""
            ? execError.stdout
            : "[]";
        const results = JSON.parse(jsonStr) as {
          filePath: string;
          messages: {
            line: number;
            column: number;
            ruleId: string | null;
            message: string;
            severity: 1 | 2;
          }[];
        }[];

        const issues: LintIssue[] = [];
        for (const result of results) {
          for (const msg of result.messages) {
            issues.push({
              file: result.filePath,
              line: msg.line,
              column: msg.column,
              ruleId: msg.ruleId,
              message: msg.message,
              severity: msg.severity === 2 ? "error" : "warning",
            });
          }
        }

        const passed =
          issues.filter((issue) => issue.severity === "error").length === 0;

        return {
          passed,
          issues,
          output,
        };
      } catch {
        // JSONパース失敗時
        return {
          passed: false,
          issues: [],
          output,
        };
      }
    }
  };

  // ===== 実行ロジック =====

  try {
    const result: StaticAnalysisResult = {
      success: true,
      analysisType,
    };

    // 型チェック実行
    if (analysisType === "type-check" || analysisType === "both") {
      const typeCheckResult = await runTypeCheck();
      result.typeCheck = typeCheckResult;
      if (!typeCheckResult.passed) {
        result.success = false;
      }
    }

    // Lint実行
    if (analysisType === "lint" || analysisType === "both") {
      const lintResult = await runLint();
      result.lint = lintResult;
      if (!lintResult.passed) {
        result.success = false;
      }
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      analysisType,
      error: errorMessage,
    };
  }
};
