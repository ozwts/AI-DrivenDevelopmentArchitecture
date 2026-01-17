/**
 * @what リポジトリインターフェースがtype aliasで定義されているか検査（classは禁止）
 * @why リポジトリは型定義であり、classではなくtype aliasで定義することで実装と分離を明確にするため
 * @failure classで定義されたリポジトリを検出した場合にエラー
 *
 * @concept リポジトリインターフェースの型定義
 *
 * - **type aliasで定義**: `type TodoRepository = { ... }`
 * - **実装と分離**: インターフェースと実装を明確に分離
 * - **Result型を使用**: すべてのメソッドは`Result<T, E>`型を返す
 * - **interfaceは使わない**: type aliasの方がオブジェクト型リテラルとして定義しやすい
 *
 * @example-good
 * ```typescript
 * import type { Result } from '@/util/result';
 * import type { UnexpectedError } from '@/util/error-util';
 *
 * export type FindByIdResult = Result<Todo | undefined, UnexpectedError>;
 * export type FindAllResult = Result<Todo[], UnexpectedError>;
 * export type SaveResult = Result<void, UnexpectedError>;
 *
 * export type TodoRepository = {
 *   todoId(): string;
 *   attachmentId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   findAll(): Promise<FindAllResult>;
 *   save(props: { todo: Todo }): Promise<SaveResult>;
 *   remove(props: { id: string }): Promise<RemoveResult>;
 * };
 *
 * export type ProjectRepository = {
 *   projectId(): string;
 *   projectMemberId(): string;
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 *   save(props: { project: Project }): Promise<SaveResult>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // NG: classで定義
 * export class TodoRepository {
 *   async findById(props: { id: string }): Promise<FindByIdResult> {
 *     // ...
 *   }
 *
 *   async save(props: { todo: Todo }): Promise<SaveResult> {
 *     // ...
 *   }
 * }
 *
 * // NG: abstract classで定義
 * export abstract class BaseRepository {
 *   abstract findById(props: { id: string }): Promise<unknown>;
 * }
 *
 * // NG: interfaceで定義（type aliasを使う）
 * export interface TodoRepository {
 *   findById(props: { id: string }): Promise<FindByIdResult>;
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.repository\.ts$/,

  visitor: (node, ctx) => {
    // classで定義されている場合はエラー
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text ?? 'Anonymous';
      ctx.report(
        node,
        `リポジトリ "${className}" はclassではなくtype aliasで定義してください。リポジトリインターフェースは型定義であり、実装と分離するためにtype aliasを使用します。`
      );
      return;
    }

    // interfaceで定義されている場合もエラー（type aliasを推奨）
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;
      if (interfaceName.includes('Repository')) {
        ctx.report(
          node,
          `リポジトリ "${interfaceName}" はinterfaceではなくtype aliasで定義してください。type aliasを使用することで、オブジェクト型リテラルとして定義できます。`
        );
      }
    }
  },
});
