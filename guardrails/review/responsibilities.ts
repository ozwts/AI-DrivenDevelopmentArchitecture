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
    scope: {
      responsibility: "ドメインモデル (Domain Model)",
      targets: "Entity, Value Object, Aggregate, Repository Interface",
    },
    toolDescription:
      "作成・修正したサーバー側のドメインモデルファイルがドメインモデルポリシーに準拠しているかを審査します。対象：エンティティ（*.ts）、リポジトリインターフェース（*-repository.ts）",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したドメインモデルファイルの絶対パスの配列（例: ['/path/to/server/src/domain/model/todo/todo.ts', '/path/to/server/src/domain/model/todo/todo-repository.ts']）",
        ),
    },
  },
  {
    id: "review_web_tests",
    title: "テストファイルレビュー",
    policyDir: "policy/web/test-strategy",
    scope: {
      responsibility: "Webテスト戦略 (Web Test Strategy)",
      targets: "Component Test (*.ct.test.tsx), Snapshot Test (*.ss.test.ts)",
    },
    toolDescription:
      "作成・修正したフロントエンドのテストファイルがテスト戦略ポリシーに準拠しているかを審査します。対象：コンポーネントテスト（*.ct.test.tsx）、スナップショットテスト（*.ss.test.ts）",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したテストファイルの絶対パスの配列（例: ['/path/to/TodoForm.ct.test.tsx', '/path/to/TodoCard.ct.test.tsx']）",
        ),
    },
  },
  {
    id: "review_server_use_cases",
    title: "ユースケース層レビュー",
    policyDir: "policy/server/use-case",
    scope: {
      responsibility: "ユースケース層 (Use Case Layer)",
      targets:
        "UseCase Implementation (*-use-case.ts), UseCase Test (*-use-case.small.test.ts)",
    },
    toolDescription:
      "作成・修正したサーバー側のユースケースファイルがユースケース層ポリシーに準拠しているかを審査します。対象：ユースケース実装（*-use-case.ts）、ユースケーステスト（*-use-case.small.test.ts）。ファイルパスに 'use-case' が含まれる場合に使用してください。",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したユースケースファイルの絶対パスの配列（例: ['/path/to/server/src/use-case/todo/register-todo-use-case.ts', '/path/to/server/src/use-case/todo/register-todo-use-case.small.test.ts']）",
        ),
    },
  },
  {
    id: "review_server_handlers",
    title: "ハンドラー層レビュー",
    policyDir: "policy/server/handler",
    scope: {
      responsibility: "ハンドラー層 (Handler Layer)",
      targets:
        "Handler Implementation (*-handler.ts), Router (*-router.ts), Response Mapper (*-response-mapper.ts)",
    },
    toolDescription:
      "作成・修正したサーバー側のハンドラーファイルがハンドラー層ポリシーに準拠しているかを審査します。対象：ハンドラー実装（*-handler.ts）、ルーター（*-router.ts）、レスポンスマッパー（*-response-mapper.ts）。ファイルパスに 'handler' が含まれる場合に使用してください。",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したハンドラーファイルの絶対パスの配列（例: ['/path/to/server/src/handler/hono-handler/todo/register-todo-handler.ts', '/path/to/server/src/handler/hono-handler/todo/todo-router.ts']）",
        ),
    },
  },
  {
    id: "review_server_repositories",
    title: "リポジトリ実装レビュー",
    policyDir: "policy/server/repository",
    scope: {
      responsibility: "リポジトリ実装 (Repository Implementation)",
      targets:
        "Repository Implementation (*-repository.ts in infrastructure/), Repository Test (*-repository.medium.test.ts)",
    },
    toolDescription:
      "作成・修正したサーバー側のリポジトリ実装ファイルがリポジトリポリシーに準拠しているかを審査します。対象：リポジトリ実装（infrastructure/repository/*-repository.ts）、リポジトリテスト（*-repository.medium.test.ts）。ファイルパスに 'infrastructure/repository' が含まれる場合に使用してください。",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したリポジトリ実装ファイルの絶対パスの配列（例: ['/path/to/server/src/infrastructure/repository/todo-repository.ts', '/path/to/server/src/infrastructure/repository/todo-repository.medium.test.ts']）",
        ),
    },
  },
  {
    id: "review_contract_openapi",
    title: "OpenAPI仕様レビュー",
    policyDir: "policy/contract/api",
    scope: {
      responsibility: "API契約仕様 (OpenAPI Specification)",
      targets: "OpenAPI YAML (*.openapi.yaml)",
    },
    toolDescription:
      "作成・修正したOpenAPI仕様ファイルがAPI契約ポリシーに準拠しているかを審査します。対象：OpenAPI YAMLファイル（*.openapi.yaml）。ファイル名に '.openapi.yaml' が含まれる場合に使用してください。",
    inputSchema: {
      targetFilePaths: z
        .array(z.string())
        .describe(
          "作成・修正したOpenAPI仕様ファイルの絶対パスの配列（例: ['/path/to/todo.openapi.yaml', '/path/to/project.openapi.yaml']）",
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
