/**
 * @what リポジトリメソッドの引数がPropsパターン（オブジェクト形式）で定義されているか検査
 * @why 引数が増えても呼び出し側の変更が最小限になり、名前付き引数で可読性が向上するため
 * @failure 直接引数を使用しているリポジトリメソッドを検出した場合にエラー
 *
 * @concept リポジトリのPropsパターン
 *
 * - **オブジェクト形式**: `findById(props: { id: string })`
 * - **拡張性**: 引数が増えても呼び出し側の変更が最小限
 * - **可読性**: 名前付き引数で意図が明確
 * - **例外**: ID生成（`todoId()`）とfindAll()は引数なしでOK
 *
 * @example-good
 * ```typescript
 * export type TodoRepository = {
 *   // Propsパターン: オブジェクト形式で引数を受け取る
 *   todoId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   findByUserId(props: { userId: string }): Promise<FindAllResult>;
 *   save(props: { todo: Todo }): Promise<SaveResult>;
 *   remove(props: { id: string }): Promise<RemoveResult>;
 * };
 *
 * export type ProjectRepository = {
 *   projectId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   findByMemberId(props: { memberId: string }): Promise<FindAllResult>;
 *   save(props: { project: Project }): Promise<SaveResult>;
 * };
 *
 * // 使用例
 * const result = await todoRepository.findById({ id: "123" });
 * await todoRepository.save({ todo: updatedTodo });
 * ```
 *
 * @example-bad
 * ```typescript
 * export type TodoRepository = {
 *   // NG: 直接引数
 *   findById(id: string): Promise<FindByIdResult>;
 *   findByUserId(userId: string): Promise<FindAllResult>;
 *   save(todo: Todo): Promise<SaveResult>;
 *   remove(id: string): Promise<RemoveResult>;
 * };
 *
 * export type ProjectRepository = {
 *   // NG: 複数の直接引数
 *   findByIdAndUserId(id: string, userId: string): Promise<FindByIdResult>;
 *   // NG: 混在
 *   updateStatus(id: string, props: { status: string }): Promise<SaveResult>;
 * };
 *
 * // NG: 呼び出し側で引数の意味が不明確
 * const result = await todoRepository.findById("123");
 * await todoRepository.findByIdAndUserId("123", "456"); // どっちがどっち？
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

// 引数なしで許可されるメソッド名パターン
const NO_ARGS_ALLOWED = [
  /Id$/,     // todoId, attachmentId, projectId等
  /^findAll$/, // findAll()は引数なしでOK
];

export const policyCheck = createASTChecker({
  filePattern: /\.repository\.ts$/,

  visitor: (node, ctx) => {
    // type alias内のメソッドシグネチャをチェック
    if (!ts.isMethodSignature(node) && !ts.isPropertySignature(node)) return;
    if (!ts.isIdentifier(node.name)) return;

    const methodName = node.name.text;

    // PropertySignatureの場合、関数型かどうかチェック
    if (ts.isPropertySignature(node)) {
      if (node.type === undefined || !ts.isFunctionTypeNode(node.type)) return;

      const funcType = node.type;
      const params = funcType.parameters;

      // 引数なしメソッドは許可パターンをチェック
      if (params.length === 0) {
        if (NO_ARGS_ALLOWED.some((p) => p.test(methodName))) return;
      }

      // 引数が1つで、型がオブジェクト型リテラルまたはpropsで始まる名前かチェック
      if (params.length === 1) {
        const param = params[0];
        const paramName = ts.isIdentifier(param.name) ? param.name.text : "";

        if (paramName === "props" || paramName.startsWith("props")) {
          return; // OK
        }

        // 型がオブジェクト型リテラルかチェック
        if (param.type !== undefined && ts.isTypeLiteralNode(param.type)) {
          ctx.report(
            node,
            `リポジトリメソッド "${methodName}" の引数名は "props" にしてください。例: ${methodName}(props: { ... })`
          );
          return;
        }
      }

      // 引数が複数ある場合はエラー
      if (params.length > 1) {
        ctx.report(
          node,
          `リポジトリメソッド "${methodName}" は複数の直接引数を持っています。Propsパターン（オブジェクト形式）を使用してください。例: ${methodName}(props: { ... })`
        );
      }
    }

    // MethodSignatureの場合
    if (ts.isMethodSignature(node)) {
      const params = node.parameters;

      // 引数なしメソッドは許可パターンをチェック
      if (params.length === 0) {
        if (NO_ARGS_ALLOWED.some((p) => p.test(methodName))) return;
      }

      // 引数が1つで、propsという名前かチェック
      if (params.length === 1) {
        const param = params[0];
        const paramName = ts.isIdentifier(param.name) ? param.name.text : "";

        if (paramName === "props" || paramName.startsWith("props")) {
          return; // OK
        }
      }

      // 引数が複数ある場合はエラー
      if (params.length > 1) {
        ctx.report(
          node,
          `リポジトリメソッド "${methodName}" は複数の直接引数を持っています。Propsパターン（オブジェクト形式）を使用してください。例: ${methodName}(props: { ... })`
        );
      }
    }
  },
});
