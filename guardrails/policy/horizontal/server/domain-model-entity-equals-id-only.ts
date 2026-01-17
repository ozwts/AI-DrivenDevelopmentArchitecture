/**
 * @what Entityのequals()メソッドがIDのみで比較しているか検査
 * @why Entityの同一性はIDで決まる。複合キーは複雑性を増し、バグの原因になる
 * @failure equals()メソッドがIDプロパティ以外を参照している場合にエラー
 *
 * @concept Entity識別の原則
 *
 * - **IDで識別**: Entityの同一性はIDのみで判断（`this.id === other.id`）
 * - **複合キー禁止**: 複数フィールドの組み合わせで識別する設計は禁止
 * - **Value Objectとの違い**: VOは全プロパティで等価性を判断するが、EntityはIDのみ
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *   readonly status: TodoStatus;
 *
 *   equals(other: Todo): boolean {
 *     return this.id === other.id;  // ✅ IDのみで比較
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *   readonly status: TodoStatus;
 *
 *   equals(other: Todo): boolean {
 *     // ❌ 複合キー（ID以外のプロパティも比較）
 *     return this.id === other.id && this.title === other.title;
 *   }
 * }
 *
 * export class AuditLog {
 *   readonly entityId: string;
 *   readonly timestamp: string;
 *
 *   equals(other: AuditLog): boolean {
 *     // ❌ 複合キー
 *     return this.entityId === other.entityId && this.timestamp === other.timestamp;
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isMethodDeclaration(node)) return;

    // equals メソッドかチェック
    if (!ts.isIdentifier(node.name) || node.name.text !== "equals") return;

    // メソッドボディをチェック
    const {body} = node;
    if (body === undefined) return;

    // this.xxx と other.xxx のアクセスを収集
    const accessedProperties = new Set<string>();

    const collectPropertyAccesses = (n: ts.Node): void => {
      // this.xxx または other.xxx パターンを検出
      if (ts.isPropertyAccessExpression(n)) {
        const obj = n.expression;
        const propName = n.name.text;

        // this.xxx の場合
        if (obj.kind === ts.SyntaxKind.ThisKeyword) {
          accessedProperties.add(propName);
        }

        // other.xxx の場合（パラメータ名がotherの場合）
        if (ts.isIdentifier(obj) && obj.text === "other") {
          accessedProperties.add(propName);
        }
      }

      ts.forEachChild(n, collectPropertyAccesses);
    };

    collectPropertyAccesses(body);

    // 'id' 以外のプロパティにアクセスしている場合はエラー
    const nonIdProperties = Array.from(accessedProperties).filter(
      (prop) => prop !== "id"
    );

    if (nonIdProperties.length > 0) {
      ctx.report(
        node,
        `equals()メソッドが "id" 以外のプロパティ [${nonIdProperties.join(", ")}] を参照しています。` +
          "Entityの同一性はIDのみで判断してください。複合キーは禁止されています。"
      );
    }

    // 'id' プロパティにアクセスしていない場合も警告
    if (!accessedProperties.has("id")) {
      ctx.report(
        node,
        "equals()メソッドが \"id\" プロパティを参照していません。" +
          "Entityの同一性はIDで判断してください。",
        "warning"
      );
    }
  },
});
