/**
 * @what UseCase層でEntity生成時にnew Entity()ではなくEntity.from()を使用しているか検証
 * @why Entity.from()はファクトリメソッドパターンで統一され、将来の変更に柔軟
 * @failure new Entity()を検出した場合にエラー
 *
 * @concept Entity生成パターン
 *
 * UseCase層でEntityインスタンスを生成する際は、`new Entity()`ではなく`Entity.from()`を使用する。
 *
 * **理由:**
 * - **ファクトリメソッドパターン**: 生成ロジックを一箇所に集約
 * - **将来の変更に柔軟**: コンストラクタシグネチャ変更時の影響を最小化
 * - **一貫性**: 全UseCaseで同じパターンを使用
 * - **明示的**: `.from()`という名前で生成意図が明確
 *
 * @example-good
 * ```typescript
 * export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
 *   async execute(input: RegisterTodoUseCaseInput): Promise<RegisterTodoUseCaseResult> {
 *     const todoId = this.#props.todoRepository.todoId();
 *     const now = dateToIsoString(this.#props.fetchNow());
 *
 *     // ✅ Entity.from()でインスタンス生成
 *     const newTodo = Todo.from({
 *       id: todoId,
 *       title: input.title,
 *       description: input.description,
 *       status: TodoStatus.todo(),
 *       priority: input.priority ?? "MEDIUM",
 *       dueDate: input.dueDate,
 *       assigneeUserId: input.assigneeUserId,
 *       attachments: [],
 *       createdAt: now,
 *       updatedAt: now,
 *     });
 *
 *     const saveResult = await this.#props.todoRepository.save({ todo: newTodo });
 *     if (saveResult.isErr()) {
 *       return Result.err(saveResult.error);
 *     }
 *
 *     return Result.ok(newTodo);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class RegisterTodoUseCaseImpl implements RegisterTodoUseCase {
 *   async execute(input: RegisterTodoUseCaseInput) {
 *     const todoId = this.#props.todoRepository.todoId();
 *     const now = dateToIsoString(this.#props.fetchNow());
 *
 *     // ❌ new Entity()で直接インスタンス生成
 *     const newTodo = new Todo({
 *       id: todoId,
 *       title: input.title,
 *       // ...
 *     });  // ❌
 *
 *     return Result.ok(newTodo);
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

/**
 * PascalCaseかチェック（EntityやValueObjectの命名規則）
 */
const isPascalCase = (name: string): boolean => /^[A-Z][a-zA-Z0-9]*$/.test(name);

/**
 * 除外するクラス名（標準ライブラリや一般的なクラス）
 */
const EXCLUDED_CLASSES = ["Date", "Error", "Map", "Set", "Promise", "Array"];

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // NewExpression（new X()形式）をチェック
    if (!ts.isNewExpression(node)) return;

    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // interfaces.tsは除外
    if (fileName.endsWith("interfaces.ts")) {
      return;
    }

    // PascalCaseクラスのnew呼び出しかチェック
    if (ts.isIdentifier(node.expression)) {
      const className = node.expression.text;

      // PascalCaseかつ除外リストにない場合、Entity/ValueObjectの可能性
      if (isPascalCase(className) && !EXCLUDED_CLASSES.includes(className)) {
        ctx.report(
          node,
          `PascalCaseクラス生成にnew ${className}()を使用しています。\n` +
            `■ ❌ Bad: const entity = new ${className}({ ... });\n` +
            `■ ✅ Good: const entity = ${className}.from({ ... });\n` +
            "■ 理由: Entity/ValueObject生成はファクトリメソッドパターン（.from()）で統一すべきです。\n" +
            "■ 注意: 標準ライブラリクラス以外のPascalCaseクラスを検出しています。誤検知の場合は無視してください。"
        );
      }
    }
  },
});
