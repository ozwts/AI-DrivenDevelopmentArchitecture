/**
 * レビュー責務定義
 *
 * 新しい責務を追加する場合は、ここに定義を追加するだけでMCPツールが自動登録されます
 */

import { z } from "zod";
import { ReviewResponsibility } from "./review-handler";

/**
 * 静的解析責務定義
 */
export type StaticAnalysisResponsibility = {
  /** 責務ID（ツール名に使用） */
  id: string;
  /** ツール説明 */
  toolDescription: string;
  /** 入力スキーマ */
  inputSchema: {
    workspace: z.ZodEnum<["server", "web"]>;
    targetFilePaths: z.ZodArray<z.ZodString>;
    analysisType: z.ZodDefault<
      z.ZodOptional<z.ZodEnum<["type-check", "lint", "both"]>>
    >;
  };
};

export const REVIEW_RESPONSIBILITIES: ReviewResponsibility[] = [
  {
    id: "review_server_domain_models",
    title: "ドメインモデルレビュー",
    policyDir: "policy/server/domain-model",
    responsibility: "ドメインモデル (Domain Model)",
    toolDescription:
      "指定したディレクトリ配下のサーバー側ドメインモデルファイルがドメインモデルポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/domain/model']）",
        ),
    },
  },
  {
    id: "review_web_tests",
    title: "テストファイルレビュー",
    policyDir: "policy/web/test-strategy",
    responsibility: "Webテスト戦略 (Web Test Strategy)",
    toolDescription:
      "指定したディレクトリ配下のフロントエンドテストファイルがテスト戦略ポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/web/src/components']）",
        ),
    },
  },
  {
    id: "review_server_use_cases",
    title: "ユースケース層レビュー",
    policyDir: "policy/server/use-case",
    responsibility: "ユースケース層 (Use Case Layer)",
    toolDescription:
      "指定したディレクトリ配下のサーバー側ユースケースファイルがユースケース層ポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/use-case']）",
        ),
    },
  },
  {
    id: "review_server_handlers",
    title: "ハンドラー層レビュー",
    policyDir: "policy/server/handler",
    responsibility: "ハンドラー層 (Handler Layer)",
    toolDescription:
      "指定したディレクトリ配下のサーバー側ハンドラーファイルがハンドラー層ポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/handler']）",
        ),
    },
  },
  {
    id: "review_server_repositories",
    title: "リポジトリ実装レビュー",
    policyDir: "policy/server/repository",
    responsibility: "リポジトリ実装 (Repository Implementation)",
    toolDescription:
      "指定したディレクトリ配下のサーバー側リポジトリ実装ファイルがリポジトリポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/server/src/infrastructure/repository']）",
        ),
    },
  },
  {
    id: "review_contract_openapi",
    title: "OpenAPI仕様レビュー",
    policyDir: "policy/contract/api",
    responsibility: "API契約仕様 (OpenAPI Specification)",
    toolDescription:
      "指定したディレクトリ配下のOpenAPI仕様ファイルがAPI契約ポリシーに準拠しているかを審査します。",
    inputSchema: {
      targetDirectories: z
        .array(z.string())
        .describe(
          "レビュー対象ディレクトリの絶対パスの配列（例: ['/path/to/contract']）",
        ),
    },
  },
];

/**
 * 静的解析責務定義
 */
export const STATIC_ANALYSIS_RESPONSIBILITIES: StaticAnalysisResponsibility[] =
  [
    {
      id: "review_static_analysis",
      toolDescription:
        "指定されたワークスペースの静的解析を実行します。TypeScript型チェック（tsc --noEmit）、ESLint（eslint --format json）、または両方を選択できます。型チェックはプロジェクト全体、Lintは指定ファイル（空配列の場合はワークスペース全体）をチェックします。",
      inputSchema: {
        workspace: z
          .enum(["server", "web"])
          .describe(
            "静的解析を実行するワークスペース: 'server'（サーバー側）、'web'（フロントエンド側）",
          ),
        targetFilePaths: z
          .array(z.string())
          .describe(
            "レビュー対象ファイルの絶対パスの配列。空配列の場合はワークスペース全体をLint対象とします（例: ['/path/to/server/src/file1.ts', '/path/to/server/src/file2.ts'] または []）",
          ),
        analysisType: z
          .enum(["type-check", "lint", "both"])
          .optional()
          .default("both")
          .describe(
            "実行する解析タイプ: 'type-check'（型チェックのみ）、'lint'（Lintのみ）、'both'（両方）。デフォルトは 'both'。",
          ),
      },
    },
  ];
