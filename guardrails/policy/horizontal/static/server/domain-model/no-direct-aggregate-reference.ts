/**
 * @what 別集約への参照はID参照（string型）のみ許可
 * @why 集約間の結合を疎にし、各集約の独立性を保つため
 * @failure エンティティが他のエンティティクラス型を直接プロパティに持っている場合にエラー
 *
 * @concept 別集約への参照はID参照
 *
 * - **ID参照**: `projectId: string | undefined`で別集約を参照
 * - **直接参照禁止**: `project: Project`のようなエンティティ型は禁止
 * - **疎結合**: 各集約の独立性を保ち、変更影響を局所化
 * - **例外**: 同一集約内の子エンティティ配列は許可
 *
 * @example-good
 * ```typescript
 * // 別集約への参照はID（string）で持つ
 * export class Todo {
 *   readonly id: string;
 *   readonly projectId: string | undefined;  // ✅ ID参照
 *   readonly assigneeId: string | undefined; // ✅ ID参照
 *   readonly attachments: Attachment[];      // ✅ 同一集約内の子エンティティ配列
 * }
 *
 * export class ProjectMember {
 *   readonly id: string;
 *   readonly userId: string;  // ✅ 別集約への参照はID
 *   readonly role: MemberRole;
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // 別集約を直接参照している
 * export class Todo {
 *   readonly project: Project | undefined;  // ❌ Project集約を直接参照
 *   readonly assignee: User | undefined;    // ❌ User集約を直接参照
 * }
 *
 * export class ProjectMember {
 *   readonly user: User;  // ❌ User集約を直接参照
 * }
 * ```
 */

import * as ts from 'typescript';
import * as path from 'path';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;

    // ディレクトリ名（集約名）を取得
    const dirName = path.basename(path.dirname(filePath));

    // 同一集約内の子エンティティをインポートから収集
    const localEntityImports = new Set<string>();
    ts.forEachChild(sourceFile, (child) => {
      if (ts.isImportDeclaration(child)) {
        const moduleSpecifier = child.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;

          // @/domain/model/{集約名}/ からのインポートは同一集約内
          if (importPath.includes(`@/domain/model/${dirName}/`)) {
            const importClause = child.importClause;
            if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
              for (const element of importClause.namedBindings.elements) {
                localEntityImports.add(element.name.text);
              }
            }
          }
        }
      }
    });

    // プロパティをチェック
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;

      const propName = member.name.text;
      const typeNode = member.type;

      if (!typeNode) continue;

      // Union型の場合は各要素をチェック
      const typesToCheck: ts.TypeNode[] = [];
      if (ts.isUnionTypeNode(typeNode)) {
        typesToCheck.push(...typeNode.types);
      } else {
        typesToCheck.push(typeNode);
      }

      for (const type of typesToCheck) {
        // 配列型の場合は要素型をチェック
        let elementType = type;
        let isArray = false;
        if (ts.isArrayTypeNode(type)) {
          elementType = type.elementType;
          isArray = true;
        }

        // TypeReferenceかチェック
        if (!ts.isTypeReferenceNode(elementType)) continue;

        const typeName = elementType.typeName;
        if (!ts.isIdentifier(typeName)) continue;

        const refTypeName = typeName.text;

        // undefined, string, number, boolean などのプリミティブ型はスキップ
        if (['undefined', 'string', 'number', 'boolean', 'Date'].includes(refTypeName)) {
          continue;
        }

        // Result, DomainError などのユーティリティ型はスキップ
        if (['Result', 'DomainError'].includes(refTypeName)) {
          continue;
        }

        // 同一集約内の子エンティティへの配列参照は許可（集約ルートのパターン）
        if (isArray && localEntityImports.has(refTypeName)) {
          continue;
        }

        // 同一集約内のValueObject参照は許可
        if (localEntityImports.has(refTypeName)) {
          continue;
        }

        // 別集約のEntityを直接参照している可能性が高い
        // プロパティ名が xxxId で終わっていない場合かつ、型名がEntityっぽい場合に警告
        // (型名がEntityクラスかどうかは静的解析では完全に判定できないため、ヒューリスティック)
        if (!propName.endsWith('Id') && !propName.endsWith('Ids')) {
          // 型名がPascalCaseで、Status, Type, Kind, Value, Props で終わらない場合は
          // Entityの可能性が高いと判断
          const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(refTypeName);
          const isLikelyValueObject = /(?:Status|Type|Kind|Value|Props|Role|Priority|Color)$/.test(refTypeName);

          if (isPascalCase && !isLikelyValueObject) {
            ctx.report(
              member,
              `プロパティ "${propName}" が別集約のエンティティ "${refTypeName}" を直接参照している可能性があります。` +
                `別集約への参照は "${propName}Id: string" のようにID参照にしてください。` +
                `同一集約内の参照であれば、このエラーは無視できます。`
            );
          }
        }
      }
    }
  },
});
