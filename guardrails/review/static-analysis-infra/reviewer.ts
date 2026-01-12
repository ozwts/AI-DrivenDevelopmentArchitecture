/**
 * インフラ静的解析レビュー実装（Infra Static Analysis Review）
 *
 * Terraform fmt、TFLint、Trivyによるインフラコードの静的解析。
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * インフラ静的解析の種類
 */
export type InfraAnalysisType = "format" | "lint" | "security" | "all";

/**
 * フォーマットチェック結果の詳細
 */
export type FormatIssue = {
  file: string;
  message: string;
};

/**
 * TFLint結果の詳細
 */
export type TFLintIssue = {
  rule: string;
  message: string;
  severity: "error" | "warning" | "notice";
  file?: string;
  line?: number;
};

/**
 * Trivy結果の詳細
 */
export type TrivyIssue = {
  id: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  message: string;
  file?: string;
  resolution?: string;
};

/**
 * インフラ静的解析結果
 */
export type InfraAnalysisResult = {
  /** 解析成功フラグ（エラーがない場合true） */
  success: boolean;
  /** 解析タイプ */
  analysisType: InfraAnalysisType;
  /** フォーマットチェック結果 */
  format?: {
    passed: boolean;
    issues: FormatIssue[];
    output: string;
  };
  /** TFLint結果 */
  lint?: {
    passed: boolean;
    issues: TFLintIssue[];
    output: string;
  };
  /** Trivy結果 */
  security?: {
    passed: boolean;
    issues: TrivyIssue[];
    output: string;
  };
  /** エラーメッセージ（解析実行失敗時） */
  error?: string;
};

/**
 * インフラ静的解析入力パラメータ
 */
export type InfraAnalysisInput = {
  /** 解析対象ディレクトリ（環境ディレクトリ） */
  targetDirectory: string;
  /** 解析タイプ */
  analysisType: InfraAnalysisType;
  /** Terraformルートディレクトリ */
  terraformRoot: string;
  /** TFLint deep_check有効化（AWS認証必要） */
  deepCheck?: boolean;
};

/**
 * 文字列またはundefinedを安全に取得
 */
const getStringOrDefault = (
  value: string | undefined,
  defaultValue: string,
): string => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }
  return value;
};

/**
 * インフラ静的解析を実行
 */
export const executeInfraAnalysis = async (
  input: InfraAnalysisInput,
): Promise<InfraAnalysisResult> => {
  const { targetDirectory, analysisType, terraformRoot, deepCheck = false } = input;

  // deep_check有効時は.tflint.deep.hcl、無効時は.tflint.hclを使用
  const tflintConfigFile = deepCheck ? ".tflint.deep.hcl" : ".tflint.hcl";

  /**
   * terraform fmt -check を実行（内部関数）
   */
  const runFormatCheck = async (): Promise<{
    passed: boolean;
    issues: FormatIssue[];
    output: string;
  }> => {
    try {
      const { stdout } = await execAsync(
        "terraform fmt -check -recursive -diff",
        {
          cwd: targetDirectory,
          maxBuffer: 1024 * 1024 * 10,
        },
      );

      return {
        passed: true,
        issues: [],
        output: getStringOrDefault(stdout, "All files are properly formatted."),
      };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const stdoutValue = getStringOrDefault(execError.stdout, "");
      const stderrValue = getStringOrDefault(execError.stderr, "");
      const output = stdoutValue !== "" ? stdoutValue : stderrValue;

      // フォーマットされていないファイルをパース
      const issues: FormatIssue[] = [];
      const lines = output.split("\n");

      for (const line of lines) {
        if (
          line.trim() !== "" &&
          !line.startsWith("-") &&
          !line.startsWith("+")
        ) {
          issues.push({
            file: line.trim(),
            message: "File is not properly formatted",
          });
        }
      }

      return {
        passed: false,
        issues,
        output,
      };
    }
  };

  /**
   * TFLint を実行（内部関数）
   */
  const runTFLint = async (): Promise<{
    passed: boolean;
    issues: TFLintIssue[];
    output: string;
  }> => {
    try {
      // TFLintを初期化してから実行
      await execAsync(
        `tflint --init --config="${terraformRoot}/${tflintConfigFile}"`,
        {
          cwd: targetDirectory,
          maxBuffer: 1024 * 1024 * 10,
        },
      );

      const { stdout } = await execAsync(
        `tflint --config="${terraformRoot}/${tflintConfigFile}" --format=json --call-module-type=all`,
        {
          cwd: targetDirectory,
          maxBuffer: 1024 * 1024 * 10,
        },
      );

      // TFLint JSON出力をパース
      const result = JSON.parse(getStringOrDefault(stdout, "{}")) as {
        issues?: {
          rule: { name: string };
          message: string;
          severity: string;
          range?: { filename: string; start?: { line: number } };
        }[];
        errors?: { message: string }[];
      };

      const resultIssues = result.issues;
      const issues: TFLintIssue[] =
        resultIssues !== null && resultIssues !== undefined
          ? resultIssues.map((issue) => ({
              rule: issue.rule.name,
              message: issue.message,
              severity: issue.severity as "error" | "warning" | "notice",
              file: issue.range?.filename,
              line: issue.range?.start?.line,
            }))
          : [];

      const hasErrors = issues.some((issue) => issue.severity === "error");

      return {
        passed: !hasErrors,
        issues,
        output: getStringOrDefault(stdout, "No issues found."),
      };
    } catch (error: unknown) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        code?: number;
      };
      const stdoutValue = getStringOrDefault(execError.stdout, "");
      const stderrValue = getStringOrDefault(execError.stderr, "");
      const output = stdoutValue !== "" ? stdoutValue : stderrValue;

      try {
        const result = JSON.parse(getStringOrDefault(execError.stdout, "{}")) as {
          issues?: {
            rule: { name: string };
            message: string;
            severity: string;
            range?: { filename: string; start?: { line: number } };
          }[];
        };

        const resultIssues = result.issues;
        const issues: TFLintIssue[] =
          resultIssues !== null && resultIssues !== undefined
            ? resultIssues.map((issue) => ({
                rule: issue.rule.name,
                message: issue.message,
                severity: issue.severity as "error" | "warning" | "notice",
                file: issue.range?.filename,
                line: issue.range?.start?.line,
              }))
            : [];

        const hasErrors = issues.some((issue) => issue.severity === "error");

        return {
          passed: !hasErrors,
          issues,
          output,
        };
      } catch {
        const errorOutput = output !== "" ? output : "TFLint execution failed";
        return {
          passed: false,
          issues: [
            {
              rule: "tflint-error",
              message: errorOutput,
              severity: "error",
            },
          ],
          output,
        };
      }
    }
  };

  /**
   * Trivy を実行（内部関数）
   */
  const runTrivy = async (): Promise<{
    passed: boolean;
    issues: TrivyIssue[];
    output: string;
  }> => {
    try {
      const { stdout } = await execAsync(
        `trivy config --config="${terraformRoot}/trivy.yaml" --format=json "${targetDirectory}"`,
        {
          cwd: terraformRoot,
          maxBuffer: 1024 * 1024 * 10,
        },
      );

      // Trivy JSON出力をパース
      const result = JSON.parse(getStringOrDefault(stdout, "{}")) as {
        Results?: {
          Target: string;
          Misconfigurations?: {
            ID: string;
            Title: string;
            Severity: string;
            Message: string;
            Resolution?: string;
          }[];
        }[];
      };

      const issues: TrivyIssue[] = [];
      const results = result.Results;
      if (results !== null && results !== undefined) {
        for (const res of results) {
          const misconfigs = res.Misconfigurations;
          if (misconfigs !== null && misconfigs !== undefined) {
            for (const misconfigItem of misconfigs) {
              issues.push({
                id: misconfigItem.ID,
                title: misconfigItem.Title,
                severity: misconfigItem.Severity as TrivyIssue["severity"],
                message: misconfigItem.Message,
                file: res.Target,
                resolution: misconfigItem.Resolution,
              });
            }
          }
        }
      }

      const hasCriticalOrHigh = issues.some(
        (issue) => issue.severity === "CRITICAL" || issue.severity === "HIGH",
      );

      return {
        passed: !hasCriticalOrHigh,
        issues,
        output: getStringOrDefault(stdout, "No security issues found."),
      };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string };
      const stdoutValue = getStringOrDefault(execError.stdout, "");
      const stderrValue = getStringOrDefault(execError.stderr, "");
      const output = stdoutValue !== "" ? stdoutValue : stderrValue;

      try {
        const result = JSON.parse(
          getStringOrDefault(execError.stdout, "{}"),
        ) as {
          Results?: {
            Target: string;
            Misconfigurations?: {
              ID: string;
              Title: string;
              Severity: string;
              Message: string;
              Resolution?: string;
            }[];
          }[];
        };

        const issues: TrivyIssue[] = [];
        const results = result.Results;
        if (results !== null && results !== undefined) {
          for (const res of results) {
            const misconfigs = res.Misconfigurations;
            if (misconfigs !== null && misconfigs !== undefined) {
              for (const misconfigItem of misconfigs) {
                issues.push({
                  id: misconfigItem.ID,
                  title: misconfigItem.Title,
                  severity: misconfigItem.Severity as TrivyIssue["severity"],
                  message: misconfigItem.Message,
                  file: res.Target,
                  resolution: misconfigItem.Resolution,
                });
              }
            }
          }
        }

        const hasCriticalOrHigh = issues.some(
          (issue) => issue.severity === "CRITICAL" || issue.severity === "HIGH",
        );

        return {
          passed: !hasCriticalOrHigh,
          issues,
          output,
        };
      } catch {
        const errorOutput =
          output !== "" ? output : "Trivy execution failed";
        return {
          passed: false,
          issues: [
            {
              id: "TRIVY-ERROR",
              title: "Trivy Execution Error",
              severity: "HIGH",
              message: errorOutput,
            },
          ],
          output,
        };
      }
    }
  };

  // ===== 実行ロジック =====

  try {
    const result: InfraAnalysisResult = {
      success: true,
      analysisType,
    };

    // フォーマットチェック実行
    if (analysisType === "format" || analysisType === "all") {
      const formatResult = await runFormatCheck();
      result.format = formatResult;
      if (!formatResult.passed) {
        result.success = false;
      }
    }

    // TFLint実行
    if (analysisType === "lint" || analysisType === "all") {
      const lintResult = await runTFLint();
      result.lint = lintResult;
      if (!lintResult.passed) {
        result.success = false;
      }
    }

    // Trivy実行
    if (analysisType === "security" || analysisType === "all") {
      const securityResult = await runTrivy();
      result.security = securityResult;
      if (!securityResult.passed) {
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
