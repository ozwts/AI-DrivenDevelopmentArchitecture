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
import * as path from "path";
import { glob } from "glob";
import { createASTChecker } from "../../ast-checker";

// ========================================
// Entity名の動的取得
// ========================================

/**
 * ドメインモデルから Entity 名を取得
 * *.entity.ts ファイルからEntity名を特定
 */
const getEntityNamesFromDomain = (workspaceRoot: string): string[] => {
  const entityPattern = path.join(
    workspaceRoot,
    "server/src/domain/model/**/*.entity.ts"
  );
  const entityFiles = glob.sync(entityPattern);

  const entityNames: string[] = [];
  for (const file of entityFiles) {
    // ファイル名からEntity名を抽出: todo.entity.ts -> Todo
    const basename = path.basename(file, ".entity.ts");
    const entityName = basename.charAt(0).toUpperCase() + basename.slice(1);
    entityNames.push(entityName);
  }

  return entityNames;
};

// キャッシュ（パフォーマンス向上）
let cachedEntityNames: string[] | null = null;

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

    // クラス名を取得
    if (ts.isIdentifier(node.expression)) {
      const className = node.expression.text;

      // Entity名リストを取得（キャッシュ）
      const workspaceRoot = fileName.split("/server/")[0];
      if (cachedEntityNames === null) {
        cachedEntityNames = getEntityNamesFromDomain(workspaceRoot);
      }

      // Entity名リストに含まれている場合のみ警告
      if (cachedEntityNames.length > 0 && cachedEntityNames.includes(className)) {
        ctx.report(
          node,
          `Entity生成にnew ${className}()を使用しています。\n` +
            `■ ❌ Bad: const entity = new ${className}({ ... });\n` +
            `■ ✅ Good: const entity = ${className}.from({ ... });\n` +
            "■ 理由: Entity生成はファクトリメソッドパターン（.from()）で統一すべきです。"
        );
      }
    }
  },
});
