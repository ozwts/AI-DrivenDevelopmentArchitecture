/**
 * @what テスト専用ヘルパーファイルの作成を禁止
 * @why Entity Dummyファクトリが既に存在するため、テスト専用ヘルパーは重複であり保守コストを増やすため
 * @failure test-helpers.ts等のテスト専用ヘルパーファイルが存在する場合にエラー
 *
 * @concept テスト専用ヘルパー関数の禁止
 *
 * **理由**:
 * - テスト専用ヘルパー関数は保守コストを増やす
 * - Entity Dummyファクトリが既に存在するため、重複
 * - モデル変更時に2箇所（Entity Dummy + テストヘルパー）を修正する必要がある
 *
 * @example-bad
 * ```typescript
 * // use-case/todo/test-helpers.ts ❌
 * export const createTestTodo = (title: string): Todo => {
 *   return new Todo({
 *     id: randomUUID(),
 *     title,
 *     status: TodoStatus.notStarted(),
 *     priority: Priority.medium(),
 *     assigneeId: randomUUID(),
 *     createdAt: new Date(),
 *     updatedAt: new Date(),
 *   });
 * };
 *
 * // use-case/todo/create-todo-use-case.small.test.ts
 * import { createTestTodo } from "./test-helpers";  // ❌
 * ```
 *
 * @example-good
 * ```typescript
 * // use-case/todo/create-todo-use-case.small.test.ts
 * import { buildTodoDummy } from "../../../domain/model/todo/todo.entity.dummy";  // ✅
 *
 * const existingTodo = buildTodoDummy({ title: "existing-todo" });
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  // test-helpers.ts, test-utils.ts等のファイルを検出
  filePattern: /test-(helpers?|utils?|fixtures?)\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // application/use-case 配下のみ対象
    if (!fileName.includes("/application/use-case/")) return;

    // SourceFileノードでのみ実行（ファイルレベルチェック）
    if (!ts.isSourceFile(node)) return;

    ctx.report(
      node,
      "テスト専用ヘルパーファイルが存在します。\n" +
        `  ファイル: ${fileName}\n` +
        "■ ❌ Bad: test-helpers.ts, test-utils.ts等でテスト用ヘルパー関数を作成\n" +
        "■ ✅ Good: Entity Dummyファクトリを直接使用\n" +
        "  import { buildTodoDummy } from \"../../../domain/model/todo/todo.entity.dummy\";\n" +
        "  const todo = buildTodoDummy({ title: \"test\" });\n" +
        "■ 理由:\n" +
        "  - Entity Dummyファクトリが既に存在するため、テスト専用ヘルパーは重複\n" +
        "  - モデル変更時に2箇所（Entity Dummy + テストヘルパー）を修正する必要がある\n" +
        "  - テスト専用ヘルパー関数は保守コストを増やす"
    );
  },
});
