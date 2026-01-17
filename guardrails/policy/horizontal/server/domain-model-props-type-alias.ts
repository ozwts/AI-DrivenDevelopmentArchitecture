/**
 * @what Entity/Value ObjectにProps型エイリアスが定義されているか検査
 * @why コンストラクタ引数を型エイリアスで定義することで、型の再利用性と可読性を向上させるため
 * @failure Props型エイリアスを持たないEntity/VOを検出した場合にエラー
 *
 * @concept Props型エイリアスパターン
 *
 * - **型の再利用**: `<Entity>Props`をconstructor、from()、Dummyファクトリで共有
 * - **単一の真実の情報源**: 型定義を1箇所に集約、DRY原則
 * - **Optionalフィールド**: すべて`| undefined`で明示的に定義（`?`は使わない）
 *
 * @example-good
 * ```typescript
 * // Entity
 * export type TodoProps = {
 *   id: string;
 *   title: string;
 *   description: string | undefined;
 *   status: TodoStatus;
 *   dueDate: string | undefined;
 *   completedAt: string | undefined;
 *   createdAt: string;
 *   updatedAt: string;
 * };
 *
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *
 *   private constructor(props: TodoProps) {
 *     this.id = props.id;
 *     this.title = props.title;
 *   }
 *
 *   static from(props: TodoProps): Result<Todo, DomainError> {
 *     return Result.ok(new Todo(props));
 *   }
 * }
 *
 * // Value Object
 * export type TodoStatusProps = {
 *   status: string;
 * };
 *
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;
 *
 *   private constructor(status: TodoStatusValue) {
 *     this.#status = status;
 *   }
 *
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // NG: Props型エイリアスがない
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *
 *   private constructor(props: { id: string; title: string }) {
 *     // ❌ インライン型定義は再利用できない
 *     this.id = props.id;
 *     this.title = props.title;
 *   }
 *
 *   static from(props: { id: string; title: string }): Result<Todo, DomainError> {
 *     // ❌ 同じ型を複数箇所で定義
 *     return Result.ok(new Todo(props));
 *   }
 * }
 *
 * // NG: Props型エイリアスがない（Value Object）
 * export class TodoStatus {
 *   static from(props: { status: string }): Result<TodoStatus, DomainError> {
 *     // ❌ インライン型定義
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;

    // クラス宣言を探す
    const classes: ts.ClassDeclaration[] = [];
    ts.forEachChild(sourceFile, (child) => {
      if (ts.isClassDeclaration(child) && child.name !== undefined) {
        classes.push(child);
      }
    });

    // Props型エイリアスを探す
    const propsTypes: string[] = [];
    ts.forEachChild(sourceFile, (child) => {
      if (ts.isTypeAliasDeclaration(child)) {
        const typeName = child.name.text;
        if (typeName.endsWith("Props")) {
          propsTypes.push(typeName);
        }
      }
    });

    // 各クラスに対応するProps型があるかチェック
    for (const classDecl of classes) {
      const className = classDecl.name?.text ?? "Anonymous";
      const expectedPropsName = `${className}Props`;

      if (!propsTypes.includes(expectedPropsName)) {
        ctx.report(
          classDecl,
          `クラス "${className}" に対応する Props型エイリアス "${expectedPropsName}" が定義されていません。` +
            "コンストラクタ引数を型エイリアスで定義して、from()メソッドと共有してください。"
        );
      }
    }
  },
});
