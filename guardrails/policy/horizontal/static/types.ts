import * as ts from 'typescript';

/**
 * 違反情報
 */
export interface Violation {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning';
  ruleId: string;
  message: string;
  /** 何をチェックしているか */
  what?: string;
  /** なぜ必要か */
  why?: string;
  /** ポリシーファイルのパス */
  policyPath?: string;
}

/**
 * チェックのメタデータ
 */
export interface CheckMetadata {
  id: string;
  name: string;
  description: string;
  layer: string;
  what: string;
  why: string;
  failure: string;
}

/**
 * チェックモジュール
 */
export interface CheckModule {
  metadata: CheckMetadata;
  check: (sourceFile: ts.SourceFile, program: ts.Program) => Violation[];
}
