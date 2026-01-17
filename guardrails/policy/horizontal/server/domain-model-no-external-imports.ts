/**
 * @what ドメインモデルで外部ライブラリをインポートしていないか検査
 * @why ドメインモデルは外部依存ゼロの純粋なTypeScriptコードであるべき
 * @failure 許可されていないインポートを検出した場合にエラー
 *
 * @concept 外部依存ゼロの原則
 *
 * - **許可**: TypeScript標準ライブラリ、`@/domain/`（ドメイン層内）、`@/util/`（Result型等）
 * - **禁止**: AWS SDK、外部ライブラリ（Hono, Zod等）、インフラ・ユースケース・ハンドラ層のコード
 * - **技術詳細の漏洩防止**: S3, DynamoDB, Cognito等の技術要素をドメインに含めない
 * - **純粋性**: ドメインモデルはビジネスロジックに集中し、技術的関心事を排除
 *
 * @example-good
 * ```typescript
 * // 許可: @/domain/（ドメイン層内）
 * import { TodoStatus } from '@/domain/model/todo/todo-status.vo';
 * import { Attachment } from '@/domain/model/todo/attachment.entity';
 * import type { Project } from '@/domain/model/project/project.entity';
 *
 * // 許可: @/util/（Result型、エラー型）
 * import { Result } from '@/util/result';
 * import { DomainError } from '@/util/error-util';
 *
 * export class Todo {
 *   readonly id: string;
 *   readonly status: TodoStatus;
 *
 *   static from(props: TodoProps): Result<Todo, DomainError> {
 *     return Result.ok(new Todo(props));
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // NG: 外部ライブラリ
 * import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
 * import { Hono } from 'hono';
 * import { z } from 'zod';
 *
 * // NG: 相対パス（上位に辿れてしまう）
 * import { SomeUseCase } from '../../application/use-case/some';
 * import { TodoStatus } from './todo-status.vo';
 *
 * // NG: @/util/以外のプロジェクト内パス
 * import { SomeUseCase } from '@/application/use-case/some';
 * import { SomeHandler } from '@/handler/some';
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

// 許可するインポートパターン
const ALLOWED_IMPORT_PATTERNS = [
  /^@\/domain\//, // @/domain/のみ許可
  /^@\/util\//, // @/util/のみ許可
];

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo|repository)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isImportDeclaration(node)) return;

    const {moduleSpecifier} = node;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const importPath = moduleSpecifier.text;

    // 許可パターンにマッチするかチェック
    const isAllowed = ALLOWED_IMPORT_PATTERNS.some((pattern) =>
      pattern.test(importPath)
    );

    if (!isAllowed) {
      ctx.report(
        node,
        `インポート "${importPath}" はドメインモデルで禁止されています。` +
          "許可されているのは @/domain/ と @/util/ のみです。"
      );
    }
  },
});
