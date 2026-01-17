/**
 * @what リポジトリメソッドの戻り値がResult型であるか検査
 * @why 明示的なエラーハンドリングを強制し、例外による制御フローを防ぐため
 * @failure リポジトリメソッドがResult型を返さない場合にエラー
 *
 * @concept リポジトリのResult型パターン
 *
 * リポジトリの全メソッドは `Result<T, E>` または `Promise<Result<T, E>>` を返す。
 * これにより、エラーハンドリングが明示的になり、throwによる例外を防ぐ。
 *
 * | メソッド種別 | 戻り値型 | 例 |
 * |-------------|----------|-----|
 * | ID生成 | `string` | `todoId(): string` |
 * | 検索（単一） | `Promise<Result<Entity \| undefined, Error>>` | `findById` |
 * | 検索（複数） | `Promise<Result<Entity[], Error>>` | `findAll`, `findByUserId` |
 * | 保存 | `Promise<Result<void, Error>>` | `save` |
 * | 削除 | `Promise<Result<void, Error>>` | `remove` |
 *
 * @example-good
 * ```typescript
 * import type { Result } from "@/util/result";
 * import type { UnexpectedError } from "@/util/error-util";
 *
 * export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
 * export type FindAllResult = Result<Todo[], UnexpectedError>;
 * export type SaveResult = Result<void, UnexpectedError>;
 * export type RemoveResult = Result<void, UnexpectedError>;
 *
 * export type TodoRepository = {
 *   todoId(): string;
 *   attachmentId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   findByUserId(props: { userId: string }): Promise<FindAllResult>;
 *   findAll(): Promise<FindAllResult>;
 *   save(props: { todo: Todo }): Promise<SaveResult>;
 *   remove(props: { id: string }): Promise<RemoveResult>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * export type TodoRepository = {
 *   // ❌ Result型を使っていない（例外をthrowする設計）
 *   findById(props: { id: string }): Promise<Todo | undefined>;
 *   save(props: { todo: Todo }): Promise<void>;
 *
 *   // ❌ 直接エンティティを返す（エラーが隠蔽される）
 *   findAll(): Promise<Todo[]>;
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// Result型を返さなくてよいメソッド名パターン
const EXEMPT_METHODS = [
  /Id$/, // todoId, attachmentId, projectId 等のID生成メソッド
];

/**
 * 型ノードが Result 型を含むかチェック
 */
const checkForResultType = (typeNode: ts.TypeNode): boolean => {
  // Promise<Result<...>> の場合
  if (ts.isTypeReferenceNode(typeNode)) {
    const {typeName} = typeNode;
    if (ts.isIdentifier(typeName)) {
      if (typeName.text === "Promise") {
        const typeArgs = typeNode.typeArguments;
        if (typeArgs !== undefined && typeArgs.length > 0) {
          return checkForResultType(typeArgs[0]);
        }
      }
      if (typeName.text === "Result") {
        return true;
      }
      // 型エイリアス（FindByIdResult等）の場合は許可
      // 命名規則で Result を含む名前は許可
      if (typeName.text.includes("Result")) {
        return true;
      }
    }
  }

  return false;
};

/**
 * 型ノードが Promise 型かチェック
 */
const isPromiseType = (typeNode: ts.TypeNode): boolean => {
  if (ts.isTypeReferenceNode(typeNode)) {
    const {typeName} = typeNode;
    if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
      return true;
    }
  }
  return false;
};

export const policyCheck = createASTChecker({
  filePattern: /\.repository\.ts$/,

  visitor: (node, ctx) => {
    // type alias内のメソッドシグネチャをチェック
    if (!ts.isPropertySignature(node) && !ts.isMethodSignature(node)) return;
    if (!ts.isIdentifier(node.name)) return;

    const methodName = node.name.text;

    // ID生成メソッドは除外
    if (EXEMPT_METHODS.some((pattern) => pattern.test(methodName))) {
      return;
    }

    // 戻り値型を取得
    let returnType: ts.TypeNode | undefined;

    if (ts.isPropertySignature(node)) {
      // PropertySignature の場合、関数型かどうかチェック
      if (node.type === undefined || !ts.isFunctionTypeNode(node.type)) return;
      returnType = node.type.type;
    } else {
      // MethodSignature の場合
      returnType = node.type;
    }

    if (returnType === undefined) {
      ctx.report(
        node,
        `リポジトリメソッド "${methodName}" に戻り値型が定義されていません。\n` +
          "■ Promise<Result<T, E>> 形式で明示的に定義してください。"
      );
      return;
    }

    // Promise<Result<...>> または Result<...> かチェック
    const hasResultType = checkForResultType(returnType);

    if (!hasResultType) {
      const typeText = returnType.getText();
      ctx.report(
        node,
        `リポジトリメソッド "${methodName}" の戻り値型 "${typeText}" が Result 型ではありません。\n` +
          "■ 明示的なエラーハンドリングのため、Promise<Result<T, E>> を使用してください。\n" +
          "■ 型エイリアス（FindByIdResult等）を使用する場合は、名前に \"Result\" を含めてください。"
      );
    }

    // Promiseを返さないメソッド（ID生成以外）も警告
    if (!isPromiseType(returnType) && !EXEMPT_METHODS.some((p) => p.test(methodName))) {
      ctx.report(
        node,
        `リポジトリメソッド "${methodName}" がPromiseを返していません。\n` +
          "■ リポジトリメソッドは非同期（Promise<Result<T, E>>）であるべきです。\n" +
          "■ ID生成メソッド（xxxId()）の場合はこの警告を無視できます。"
      );
    }
  },
});
