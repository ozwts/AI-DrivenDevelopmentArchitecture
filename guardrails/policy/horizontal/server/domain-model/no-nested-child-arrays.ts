/**
 * @what 集約階層の深さを1階層までに制限（孫エンティティ配列の禁止）
 * @why 集約が深くなりすぎると整合性境界が曖昧になり、トランザクション管理が複雑化するため
 * @failure 子エンティティがさらにエンティティ配列を持っている場合にエラー
 *
 * @concept 集約のサイズ制限（階層の深さ）
 *
 * - **1階層まで**: 親-子の関係のみ許可（孫エンティティは禁止）
 * - **深すぎる兆候**: ディレクトリが深くなる = 集約が大きすぎる
 * - **分割の検討**: 孫が必要な場合は別集約として設計
 *
 * @example-good
 * ```typescript
 * // 1階層: 親-子のみ
 * // todo/todo.entity.ts（集約ルート）
 * export class Todo {
 *   readonly id: string;
 *   readonly attachments: Attachment[];  // ✅ 子エンティティ配列
 * }
 *
 * // todo/attachment.entity.ts（子エンティティ）
 * export class Attachment {
 *   readonly id: string;
 *   readonly fileName: string;
 *   // 配列プロパティなし = 孫エンティティなし ✅
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // 2階層: 孫エンティティは禁止
 * // project/task.entity.ts（子エンティティ）
 * export class Task {
 *   readonly id: string;
 *   readonly subTasks: SubTask[];  // ❌ 子エンティティが配列を持つ = 2階層
 * }
 *
 * // project/sub-task.entity.ts（孫エンティティ）
 * export class SubTask {
 *   readonly id: string;
 * }
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    const className = node.name?.text ?? "Anonymous";
    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;

    // ファイル名とディレクトリ名を取得
    const fileName = path.basename(filePath);
    const dirName = path.basename(path.dirname(filePath));

    // エンティティ名を取得（例: "task.entity.ts" → "task"）
    const entityName = fileName.replace(".entity.ts", "");

    // ディレクトリ名と一致する場合は集約ルート → チェック不要
    if (entityName === dirName) return;

    // 子エンティティの場合、配列プロパティをチェック
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;

      const propName = ts.isIdentifier(member.name) ? member.name.text : "";
      const typeNode = member.type;

      if (typeNode === undefined) continue;

      // 配列型かチェック
      if (ts.isArrayTypeNode(typeNode)) {
        // 配列の要素型を取得
        const {elementType} = typeNode;

        // 要素型がTypeReference（クラス参照）かチェック
        if (ts.isTypeReferenceNode(elementType)) {
          const {typeName} = elementType;
          if (ts.isIdentifier(typeName)) {
            // Entity配列を持っている場合はエラー
            ctx.report(
              member,
              `子エンティティ "${className}" がエンティティ配列 "${propName}: ${typeName.text}[]" を持っています。` +
                "集約階層は1階層（親-子）までに制限してください。孫エンティティは別集約として設計するか、" +
                "設計を見直してください。"
            );
          }
        }
      }
    }
  },
});
