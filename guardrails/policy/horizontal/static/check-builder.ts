/**
 * チェックビルダー - 定型処理を隠蔽し、宣言的なチェック定義を可能にする
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import { CheckModule, Violation, CheckMetadata } from './types';
import { extractMetadata } from './extract-metadata';

/**
 * チェック定義の型
 */
export interface CheckDefinition {
  /**
   * チェック対象ファイルのパターン（正規表現）
   * 例: /\.(entity|vo)\.ts$/
   */
  filePattern?: RegExp;

  /**
   * ASTノード訪問関数
   */
  visitor(node: ts.Node, ctx: CheckContext): void;
}

/**
 * チェックコンテキスト - visitor関数に提供される
 */
export interface CheckContext {
  /**
   * 違反を報告
   */
  report(node: ts.Node, message: string, severity?: 'error' | 'warning'): void;

  /**
   * 現在のソースファイル
   */
  sourceFile: ts.SourceFile;

  /**
   * TypeScript Program
   */
  program: ts.Program;
}

/**
 * チェックを作成する
 */
export default function createCheck(definition: CheckDefinition): CheckModule {
  // 呼び出し元のファイルパスを取得（スタックトレースから）
  const stackTrace = new Error().stack || '';

  // スタックトレースを行ごとに分割し、createCheck呼び出し元を探す
  const lines = stackTrace.split('\n');
  let callerPath = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // createCheck自身の行はスキップ
    if (line.includes('check-builder.ts') || line.includes('at createCheck')) {
      continue;
    }

    // at ... (file://path:line:col) のパターン
    const match1 = line.match(/\((file:\/\/[^:]+):\d+:\d+\)/);
    if (match1) {
      callerPath = match1[1].replace('file://', '');
      break;
    }

    // at file://path:line:col のパターン
    const match2 = line.match(/at\s+(file:\/\/[^:]+):\d+:\d+/);
    if (match2) {
      callerPath = match2[1].replace('file://', '');
      break;
    }

    // at ... (/path:line:col) のパターン（非file://）
    const match3 = line.match(/\(([^:]+\.ts):\d+:\d+\)/);
    if (match3) {
      callerPath = match3[1];
      break;
    }
  }

  // ファイルからJSDocを抽出
  const jsDoc = extractJSDocFromFile(callerPath);

  // メタデータを生成
  const metadata = extractMetadata(callerPath, jsDoc);

  // ポリシーパスを相対パスに変換
  const policyPath = callerPath.includes('/policy/horizontal/static/')
    ? 'policy/horizontal/static/' + callerPath.split('/policy/horizontal/static/')[1]
    : callerPath;

  // チェック関数を生成
  const check = (sourceFile: ts.SourceFile, program: ts.Program): Violation[] => {
    const violations: Violation[] = [];
    const fileName = sourceFile.fileName;

    // ファイルパターンチェック
    if (definition.filePattern && !definition.filePattern.test(fileName)) {
      return violations;
    }

    // コンテキストを作成
    const ctx: CheckContext = {
      report: (node: ts.Node, message: string, severity: 'error' | 'warning' = 'error') => {
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
    function visit(node: ts.Node) {
      definition.visitor(node, ctx);
      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return violations;
  };

  return { metadata, check };
}

/**
 * ファイルから先頭のJSDocコメントを抽出
 */
function extractJSDocFromFile(filePath: string): string {
  if (!filePath || !fs.existsSync(filePath)) {
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const match = content.match(/^\/\*\*\n([\s\S]*?)\n\s*\*\//);

  return match ? match[0] : '';
}
