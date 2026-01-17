/**
 * @what Entity/Result変数の再代入を検出し、メソッドチェーンを推奨
 * @why 変数再代入は可変性を導入し、読みにくく、バグの温床になるため
 * @failure PascalCase変数の再代入（entity = entity.method()）を検出した場合に警告
 *
 * @concept 宣言的なメソッドチェーン
 *
 * Entity/Resultの更新では、変数再代入ではなく`Result.map()`によるメソッドチェーンを使用し、
 * 不変性を保ちながら宣言的に変換を表現する。
 *
 * **理由:**
 * - **読みやすさ**: 変換フローが一連の宣言として表現される
 * - **不変性**: 変数再代入を避け、バグを防止
 * - **エラー伝播**: エラーが発生した時点でチェーンが中断
 * - **型安全性**: Result.map()が自動でResult.ok()に包む
 * - **宣言的**: 命令的（let x; x = ...）ではなく、宣言的（const x = ...）
 *
 * @example-good
 * ```typescript
 * export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
 *   async execute(input: UpdateTodoUseCaseInput): Promise<UpdateTodoUseCaseResult> {
 *     // ✅ constで宣言、メソッドチェーンで変換
 *     const updatedResult = Result.ok(existing)
 *       .map((t: Todo) => t.retitle(input.title, now))
 *       .map((t: Todo) => t.clarify(input.description, now))
 *       .map((t: Todo) => t.reschedule(input.dueDate, now));
 *
 *     if (updatedResult.isErr()) {
 *       return updatedResult;
 *     }
 *
 *     // ...
 *   }
 * }
 *
 * export class CompleteTodoUseCaseImpl implements CompleteTodoUseCase {
 *   async execute(input: CompleteTodoUseCaseInput): Promise<CompleteTodoUseCaseResult> {
 *     // ✅ constで宣言、Entityメソッドで変換
 *     const completed = existing.complete(now);
 *
 *     // ...
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class UpdateTodoUseCaseImpl implements UpdateTodoUseCase {
 *   async execute(input: UpdateTodoUseCaseInput) {
 *     // ❌ letで宣言、変数再代入で更新
 *     let updated = existing;
 *     updated = updated.retitle(input.title, now);  // ❌
 *     updated = updated.clarify(input.description, now);  // ❌
 *     updated = updated.reschedule(input.dueDate, now);  // ❌
 *
 *     // ...
 *   }
 * }
 *
 * export class CompleteTodoUseCaseImpl implements CompleteTodoUseCase {
 *   async execute(input: CompleteTodoUseCaseInput) {
 *     // ❌ letで宣言、変数再代入
 *     let todo = existing;
 *     todo = todo.complete(now);  // ❌
 *
 *     // ...
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

/**
 * 変数がletで宣言されているかチェック
 */
const isDeclaredWithLet = (varName: string, node: ts.Node): boolean => {
  // ノードの親を辿って変数宣言を探す
  let currentNode: ts.Node | undefined = node;

  while (currentNode !== undefined) {
    // VariableDeclarationを探す
    if (
      ts.isVariableDeclaration(currentNode) &&
      ts.isIdentifier(currentNode.name) &&
      currentNode.name.text === varName
    ) {
      // 親のVariableDeclarationListを確認
      const { parent } = currentNode;
      if (ts.isVariableDeclarationList(parent)) {
        // eslint-disable-next-line no-bitwise
        return (parent.flags & ts.NodeFlags.Let) !== 0;
      }
    }

    // 同じスコープ内の他の文を探す（ExpressionStatementの前に宣言がある場合）
    if (ts.isBlock(currentNode)) {
      for (const statement of currentNode.statements) {
        if (ts.isVariableStatement(statement)) {
          const declList = statement.declarationList;
          for (const decl of declList.declarations) {
            if (ts.isIdentifier(decl.name) && decl.name.text === varName) {
              // eslint-disable-next-line no-bitwise
              return (declList.flags & ts.NodeFlags.Let) !== 0;
            }
          }
        }
      }
    }

    currentNode = currentNode.parent;
  }

  return false;
};

/**
 * Entityメソッドのパターンかチェック（誤検知を減らすため）
 *
 * 除外リストアプローチ: 一般的なJavaScript操作のみを除外し、それ以外を検出
 */
const isEntityMethodPattern = (methodName: string): boolean => {
  // 除外: 一般的なJavaScript操作（誤検知を防ぐ）
  const excludedMethods = [
    // 配列メソッド
    "map",
    "filter",
    "reduce",
    "find",
    "findIndex",
    "forEach",
    "some",
    "every",
    "slice",
    "concat",
    "push",
    "pop",
    "shift",
    "unshift",
    "splice",
    "sort",
    "reverse",
    "join",
    "includes",
    "indexOf",
    "lastIndexOf",
    // 文字列メソッド
    "trim",
    "trimStart",
    "trimEnd",
    "toLowerCase",
    "toUpperCase",
    "substring",
    "substr",
    "split",
    "replace",
    "match",
    "search",
    "startsWith",
    "endsWith",
    // オブジェクトメソッド
    "toString",
    "toJSON",
    "valueOf",
    // Promiseメソッド
    "then",
    "catch",
    "finally",
    // Resultメソッド
    "isOk",
    "isErr",
    "unwrap",
    "unwrapOr",
    "unwrapOrElse",
  ];

  // 除外リストにあれば、Entityメソッドではない
  return !excludedMethods.includes(methodName);
};

/**
 * executeメソッド内かチェック
 */
const isInExecuteMethod = (node: ts.Node): boolean => {
  let currentNode: ts.Node | undefined = node;

  while (currentNode !== undefined) {
    if (
      ts.isMethodDeclaration(currentNode) &&
      ts.isIdentifier(currentNode.name) &&
      currentNode.name.text === "execute"
    ) {
      return true;
    }
    currentNode = currentNode.parent;
  }

  return false;
};

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // executeメソッド内のみをチェック
    if (!isInExecuteMethod(node)) {
      return;
    }

    // BinaryExpression（entity = entity.method()）をチェック
    if (!ts.isBinaryExpression(node)) return;

    // = 演算子かチェック
    if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return;

    // 左辺がIdentifierかチェック
    if (!ts.isIdentifier(node.left)) return;

    const varName = node.left.text;

    // 右辺がCallExpression（メソッド呼び出し）かチェック
    if (!ts.isCallExpression(node.right)) return;

    // 右辺が entity.method() パターンかチェック
    if (!ts.isPropertyAccessExpression(node.right.expression)) return;

    const rightObjExpr = node.right.expression.expression;
    const methodName = node.right.expression.name.text;

    // Entityメソッドのパターンかチェック（誤検知を減らす）
    if (!isEntityMethodPattern(methodName)) {
      return;
    }

    // 右辺のオブジェクトが左辺と同じ変数名かチェック
    if (ts.isIdentifier(rightObjExpr) && rightObjExpr.text === varName) {
      // letで宣言されているかチェック（より堅牢な検出）
      const isLetDeclaration = isDeclaredWithLet(varName, node);

      ctx.report(
        node,
        `変数再代入パターンを使用しています: "${varName} = ${varName}.${methodName}()"${isLetDeclaration ? "（let宣言）" : ""}\n` +
          "■ ❌ Bad: let updated = existing; updated = updated.retitle(...);\n" +
          "■ ✅ Good (Method Chain): const updatedResult = Result.ok(existing).map((t) => t.retitle(...));\n" +
          "■ ✅ Good (Single Call): const completed = existing.complete(now);\n" +
          "■ 理由: 変数再代入は可変性を導入し、バグの温床になります。constとメソッドチェーンで不変性を保ちましょう。\n" +
          "■ 注意: 複数の変換がある場合はResult.map()チェーン、1回の変換ならconstで新変数を作成してください。"
      );
    }
  },
});
