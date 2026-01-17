/**
 * AST Checker - TypeScript Compiler API による静的解析フレームワーク
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

// ========================================
// 型定義
// ========================================

/**
 * 違反情報
 */
export type Violation = {
  file: string;
  line: number;
  column?: number;
  severity: "error" | "warning";
  ruleId: string;
  message: string;
  /** 何をチェックしているか */
  what?: string;
  /** なぜ必要か */
  why?: string;
  /** ポリシーファイルのパス */
  policyPath?: string;
};

/**
 * チェックのメタデータ
 */
export type CheckMetadata = {
  id: string;
  name: string;
  description: string;
  layer: string;
  what: string;
  why: string;
  failure: string;
};

/**
 * チェックモジュール
 */
export type CheckModule = {
  metadata: CheckMetadata;
  check: (sourceFile: ts.SourceFile, program: ts.Program) => Violation[];
};

/**
 * AST Checker コンテキスト - visitor関数に提供される
 */
export type ASTCheckerContext = {
  /**
   * 違反を報告
   */
  report(node: ts.Node, message: string, severity?: "error" | "warning"): void;

  /**
   * 現在のソースファイル
   */
  sourceFile: ts.SourceFile;

  /**
   * TypeScript Program
   */
  program: ts.Program;
};

/**
 * AST Checker 定義
 */
export type ASTCheckerDefinition = {
  /**
   * チェック対象ファイルのパターン（正規表現）
   * 例: /\.(entity|vo)\.ts$/
   */
  filePattern?: RegExp;

  /**
   * ASTノード訪問関数
   */
  visitor(node: ts.Node, ctx: ASTCheckerContext): void;
};

// ========================================
// メタデータ抽出
// ========================================

type JSDocTags = {
  what?: string;
  why?: string;
  failure?: string;
};

/**
 * JSDocコメントをパースしてタグを抽出
 */
const parseJSDoc = (jsDoc: string): JSDocTags => {
  const tags: JSDocTags = {};

  const whatMatch = jsDoc.match(/@what\s+(.+)/);
  if (whatMatch !== null) {
    tags.what = whatMatch[1].trim();
  }

  const whyMatch = jsDoc.match(/@why\s+(.+)/);
  if (whyMatch !== null) {
    tags.why = whyMatch[1].trim();
  }

  const failureMatch = jsDoc.match(/@failure\s+(.+)/);
  if (failureMatch !== null) {
    tags.failure = failureMatch[1].trim();
  }

  return tags;
};

/**
 * ファイルから先頭のJSDocコメントを抽出
 */
const extractJSDocFromFile = (filePath: string): string => {
  if (filePath.length === 0 || !fs.existsSync(filePath)) {
    return "";
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const match = content.match(/^\/\*\*\n([\s\S]*?)\n\s*\*\//);

  return match !== null ? match[0] : "";
};

/**
 * ファイル名からレイヤープレフィックスを抽出
 * 例: "domain-model-no-throw.ts" → "domain-model"
 * 例: "common-no-new-date.ts" → "common"
 */
const extractLayerFromFileName = (fileName: string): string => {
  // 既知のレイヤープレフィックス（長い順にマッチ）
  const knownPrefixes = [
    "domain-model",
    "use-case",
    "di-container",
    "handler",
    "repository",
    "port",
    "logger",
    "common",
  ];

  for (const prefix of knownPrefixes) {
    if (fileName.startsWith(`${prefix}-`)) {
      return prefix;
    }
  }

  // プレフィックスが見つからない場合は空文字
  return "";
};

/**
 * ファイルパスとJSDocコメントからメタデータを生成
 */
const extractMetadata = (filePath: string, jsDoc: string): CheckMetadata => {
  const tags = parseJSDoc(jsDoc);

  // ファイルパスから workspace と id を自動生成
  // フラット構造: policy/horizontal/{workspace}/{file}.ts
  const relativePath = filePath.split("/policy/horizontal/")[1];
  const parts =
    typeof relativePath === "string" && relativePath.length > 0
      ? relativePath.split("/")
      : [];
  const workspace = parts[0]; // server, web, infra
  const fileName = path.basename(filePath, ".ts");

  // ファイル名からレイヤーを抽出
  const layer = extractLayerFromFileName(fileName);

  const id = `${workspace}/${fileName}`;

  return {
    id,
    name: fileName.replace(/-/g, " "),
    description:
      typeof tags.what === "string" && tags.what.length > 0 ? tags.what : "",
    layer: typeof layer === "string" && layer.length > 0 ? layer : "",
    what:
      typeof tags.what === "string" && tags.what.length > 0 ? tags.what : "",
    why: typeof tags.why === "string" && tags.why.length > 0 ? tags.why : "",
    failure:
      typeof tags.failure === "string" && tags.failure.length > 0
        ? tags.failure
        : "",
  };
};

// ========================================
// AST Checker 作成
// ========================================

/**
 * AST Checker を作成する
 */
export const createASTChecker = (
  definition: ASTCheckerDefinition
): CheckModule => {
  // 呼び出し元のファイルパスを取得（スタックトレースから）
  const stackTraceRaw = new Error().stack;
  const stackTrace =
    typeof stackTraceRaw === "string" && stackTraceRaw.length > 0
      ? stackTraceRaw
      : "";

  // スタックトレースを行ごとに分割し、createASTChecker呼び出し元を探す
  const lines = stackTrace.split("\n");
  let callerPath = "";

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    // createASTChecker自身の行はスキップ
    if (
      line.includes("ast-checker.ts") ||
      line.includes("at createASTChecker")
    ) {
      continue;
    }

    // at ... (file://path:line:col) のパターン
    const match1 = line.match(/\((file:\/\/[^:]+):\d+:\d+\)/);
    if (match1 !== null) {
      [, callerPath] = match1;
      callerPath = callerPath.replace("file://", "");
      break;
    }

    // at file://path:line:col のパターン
    const match2 = line.match(/at\s+(file:\/\/[^:]+):\d+:\d+/);
    if (match2 !== null) {
      [, callerPath] = match2;
      callerPath = callerPath.replace("file://", "");
      break;
    }

    // at ... (/path:line:col) のパターン（非file://）
    const match3 = line.match(/\(([^:]+\.ts):\d+:\d+\)/);
    if (match3 !== null) {
      [, callerPath] = match3;
      break;
    }
  }

  // ファイルからJSDocを抽出
  const jsDoc = extractJSDocFromFile(callerPath);

  // メタデータを生成
  const metadata = extractMetadata(callerPath, jsDoc);

  // ポリシーパスを相対パスに変換
  const policyPath = callerPath.includes("/policy/horizontal/")
    ? `policy/horizontal/${callerPath.split("/policy/horizontal/")[1]}`
    : callerPath;

  // チェック関数を生成
  const check = (
    sourceFile: ts.SourceFile,
    program: ts.Program
  ): Violation[] => {
    const violations: Violation[] = [];
    const { fileName } = sourceFile;

    // ファイルパターンチェック
    if (
      typeof definition.filePattern !== "undefined" &&
      !definition.filePattern.test(fileName)
    ) {
      return violations;
    }

    // コンテキストを作成
    const ctx: ASTCheckerContext = {
      report: (
        node: ts.Node,
        message: string,
        severity: "error" | "warning" = "error"
      ) => {
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile)
        );

        violations.push({
          file: fileName,
          line: line + 1,
          column: character + 1,
          severity,
          ruleId: metadata.id,
          message,
          what: metadata.what,
          why: metadata.why,
          policyPath,
        });
      },
      sourceFile,
      program,
    };

    // AST走査
    const visit = (node: ts.Node): void => {
      definition.visitor(node, ctx);
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return violations;
  };

  return { metadata, check };
};
