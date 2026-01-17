/**
 * @what N+1問題（ループ内での個別データ取得）を検出
 * @why N+1問題はパフォーマンスを著しく低下させるため
 * @failure forループ/forEach内でawait repository.findById()パターンを検出した場合に警告
 *
 * @concept N+1問題の防止
 *
 * ループ内で個別にデータ取得する代わりに、リポジトリにバッチ取得メソッド（findByIds等）を追加する。
 *
 * **問題点（N+1問題）**:
 * - データベースへのクエリ回数が N+1 回になる（N件のデータに対して）
 * - パフォーマンスが著しく低下
 * - データ量増加に伴い線形的に悪化
 *
 * **理由（バッチ取得）**:
 * - **パフォーマンス**: 1回のクエリで複数件取得
 * - **スケーラビリティ**: データ量増加に対して効率的
 * - **ネットワークコスト**: 通信回数の削減
 *
 * @example-good
 * ```typescript
 * // ProjectRepository interface
 * export type ProjectRepository = {
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   findByIds(props: { ids: string[] }): Promise<FindByIdsResult>; // ✅ バッチ取得追加
 * };
 *
 * // UseCase層
 * export class ListTodosWithProjectsUseCaseImpl implements ListTodosWithProjectsUseCase {
 *   async execute(input: ListTodosWithProjectsUseCaseInput): Promise<ListTodosWithProjectsUseCaseResult> {
 *     const todos = ...; // TODO一覧取得
 *
 *     // ✅ プロジェクトIDを収集してバッチ取得
 *     const projectIds = todos.map((t) => t.projectId).filter((id) => id !== undefined);
 *     const projectsResult = await this.#props.projectRepository.findByIds({ ids: projectIds });
 *
 *     if (projectsResult.isErr()) {
 *       return projectsResult;
 *     }
 *
 *     // マップを作成して効率的にアクセス
 *     const projectMap = new Map(projectsResult.data.map((p) => [p.id, p]));
 *
 *     const todosWithProjects = todos.map((todo) => ({
 *       ...todo,
 *       project: todo.projectId !== undefined ? projectMap.get(todo.projectId) : undefined,
 *     }));
 *
 *     return Result.ok({ todos: todosWithProjects });
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // UseCase層
 * export class ListTodosWithProjectsUseCaseImpl implements ListTodosWithProjectsUseCase {
 *   async execute(input: ListTodosWithProjectsUseCaseInput) {
 *     const todos = ...; // TODO一覧取得
 *
 *     const todosWithProjects = [];
 *
 *     // ❌ ループ内で個別取得（N+1問題）
 *     for (const todo of todos) {
 *       if (todo.projectId !== undefined) {
 *         const projectResult = await this.#props.projectRepository.findById({
 *           id: todo.projectId,
 *         }); // ❌ N回クエリ実行
 *
 *         if (projectResult.isErr()) {
 *           return projectResult;
 *         }
 *
 *         todosWithProjects.push({
 *           ...todo,
 *           project: projectResult.data,
 *         });
 *       }
 *     }
 *
 *     return Result.ok({ todos: todosWithProjects });
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // AwaitExpression（await xxx）をチェック
    if (!ts.isAwaitExpression(node)) return;

    // await の中身がCallExpressionかチェック
    if (!ts.isCallExpression(node.expression)) return;

    const callExpr = node.expression;

    // PropertyAccessExpression（repository.findById()形式）かチェック
    if (!ts.isPropertyAccessExpression(callExpr.expression)) return;

    const methodName = callExpr.expression.name.text;

    // findById, findByXxx, get, fetch等の単一取得メソッド名かチェック
    const isSingleFetchMethod =
      methodName === "findById" ||
      methodName === "getById" ||
      methodName === "fetchById" ||
      (methodName.startsWith("findBy") && !methodName.endsWith("Ids")) ||
      (methodName.startsWith("getBy") && !methodName.endsWith("Ids"));

    if (!isSingleFetchMethod) return;

    // 親ノードをチェック - ループ内にあるか
    let currentNode: ts.Node | undefined = node;
    let isInLoop = false;

    while (currentNode !== undefined) {
      // ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoStatement
      if (
        ts.isForStatement(currentNode) ||
        ts.isForInStatement(currentNode) ||
        ts.isForOfStatement(currentNode) ||
        ts.isWhileStatement(currentNode) ||
        ts.isDoStatement(currentNode)
      ) {
        isInLoop = true;
        break;
      }

      // CallExpression（forEach, map, filter等）をチェック
      if (ts.isCallExpression(currentNode)) {
        const expr = currentNode.expression;
        if (
          ts.isPropertyAccessExpression(expr) &&
          ts.isIdentifier(expr.name)
        ) {
          const arrayMethodName = expr.name.text;
          if (
            arrayMethodName === "forEach" ||
            arrayMethodName === "map" ||
            arrayMethodName === "filter" ||
            arrayMethodName === "reduce"
          ) {
            isInLoop = true;
            break;
          }
        }
      }

      currentNode = currentNode.parent;
    }

    if (isInLoop) {
      ctx.report(
        node,
        `ループ内で単一取得メソッド（${methodName}）を使用しています（N+1問題の可能性）。\n` +
          "■ ❌ Bad: for (const item of items) { await repository.findById({ id: item.id }); }\n" +
          "■ ✅ Good: const ids = items.map(i => i.id); const results = await repository.findByIds({ ids });\n" +
          "■ 理由: バッチ取得メソッド（findByIds等）を使用してデータベースクエリ回数を削減すべきです。\n" +
          "■ 対処: リポジトリインターフェースにfindByIds()等のバッチ取得メソッドを追加してください。"
      );
    }
  },
});
