import type { Violation } from "../../policy/ast-checker";

/**
 * 違反情報をMarkdown形式でフォーマット
 */
export const formatViolations = (violations: Violation[]): string => {
  if (violations.length === 0) {
    return "✅ 違反は検出されませんでした。";
  }

  // ファイルごとにグループ化
  const violationsByFile = new Map<string, Violation[]>();

  for (const violation of violations) {
    const existing = violationsByFile.get(violation.file);
    const list = existing !== undefined ? existing : [];
    list.push(violation);
    violationsByFile.set(violation.file, list);
  }

  // Markdown生成
  const lines: string[] = [];
  lines.push(`❌ ${violations.length}件の違反が検出されました。\n`);

  for (const [file, fileViolations] of violationsByFile) {
    lines.push(`## ${file}`);

    for (const violation of fileViolations) {
      const location =
        violation.column !== undefined && violation.column > 0
          ? `L${violation.line}:${violation.column}`
          : `L${violation.line}`;

      const emoji = violation.severity === "error" ? "❌" : "⚠️";

      // 1行にまとめる: emoji [ruleId] location message
      lines.push(`${emoji} [${violation.ruleId}] ${location} ${violation.message}`);

      // what/why/policyPathは詳細として追加（オプション）
      const details: string[] = [];
      if (violation.what !== undefined && violation.what !== "") {
        details.push(`What: ${violation.what}`);
      }
      if (violation.why !== undefined && violation.why !== "") {
        details.push(`Why: ${violation.why}`);
      }
      if (violation.policyPath !== undefined && violation.policyPath !== "") {
        details.push(`Policy: ${violation.policyPath}`);
      }

      if (details.length > 0) {
        lines.push(`  ↳ ${details.join(" | ")}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
};
