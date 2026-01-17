/**
 * @what リポジトリにID生成メソッドが存在するか検査
 * @why エンティティIDの生成はリポジトリの責務であり、一貫したID生成を保証するため
 * @failure ID生成メソッドを持たないリポジトリを検出した場合にエラー
 *
 * @concept ID生成はリポジトリの責務
 *
 * - **`{entityName}Id(): string`**: 集約ルートのID生成
 * - **子エンティティも含む**: `attachmentId()`, `projectMemberId()`等
 * - **一貫性**: UseCase層でuuid()を直接呼ぶのではなく、リポジトリに委譲
 * - **テスタビリティ**: Dummyリポジトリで固定値を返せる
 *
 * @example-good
 * ```typescript
 * export type TodoRepository = {
 *   // ID生成メソッド: {entityName}Id() の形式
 *   todoId(): string;
 *   // 子エンティティのID生成も提供
 *   attachmentId(): string;
 *
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { todo: Todo }): Promise<SaveResult>;
 * };
 *
 * export type ProjectRepository = {
 *   // 集約ルートのID生成
 *   projectId(): string;
 *   // 子エンティティのID生成
 *   projectMemberId(): string;
 *
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { project: Project }): Promise<SaveResult>;
 * };
 *
 * export type UserRepository = {
 *   userId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { user: User }): Promise<SaveResult>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * export type TodoRepository = {
 *   // NG: ID生成メソッドがない
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { todo: Todo }): Promise<SaveResult>;
 * };
 *
 * export type ProjectRepository = {
 *   // NG: ID生成メソッドがない
 *   // UseCase層でuuid()を直接呼ぶことになり、責務が分散する
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { project: Project }): Promise<SaveResult>;
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.repository\.ts$/,

  visitor: (node, ctx) => {
    // type aliasのみチェック
    if (!ts.isTypeAliasDeclaration(node)) return;

    const typeName = node.name.text;

    // Repositoryで終わる型のみチェック
    if (!typeName.endsWith("Repository")) return;

    // 型がオブジェクト型リテラルかチェック
    if (!ts.isTypeLiteralNode(node.type)) return;

    // {entityName}Id()メソッドを探す
    // リポジトリ名から予想されるエンティティ名を取得
    const entityName = typeName.replace("Repository", "");
    const expectedIdMethod =
      `${entityName.charAt(0).toLowerCase() + entityName.slice(1)  }Id`;

    const hasIdMethod = node.type.members.some((member) => {
      if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member))
        return false;
      if (!ts.isIdentifier(member.name)) return false;

      const memberName = member.name.text;
      // {entityName}Id または任意の*Id メソッドを許可
      return memberName === expectedIdMethod || memberName.endsWith("Id");
    });

    if (!hasIdMethod) {
      ctx.report(
        node,
        `リポジトリ "${typeName}" には ID生成メソッド（例: ${expectedIdMethod}(): string）が必要です。エンティティIDの生成はリポジトリの責務です。`
      );
    }
  },
});
