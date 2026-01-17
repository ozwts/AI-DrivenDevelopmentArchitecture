/**
 * @what 集約の境界判断基準（何を1つの集約に含めるか）
 * @why 集約の境界を適切に設計し、整合性境界とパフォーマンスのバランスを取るため
 * @failure 集約の境界が不適切な場合にエラー（静的検出は困難だが@conceptとして文書化）
 *
 * @concept 集約の境界判断基準
 *
 * ## 1つの集約に含める基準
 *
 * | 基準 | 説明 | 例 |
 * |------|------|-----|
 * | 強い整合性が必要 | 同時に更新される必要がある | Todo + Attachment |
 * | ライフサイクルが同じ | 親が削除されたら子も削除 | Project + ProjectMember |
 * | 同じトランザクション境界 | 同時に保存される | Order + OrderItem |
 *
 * ## 別の集約に分ける基準
 *
 * | 基準 | 説明 | 例 |
 * |------|------|-----|
 * | 独立したライフサイクル | 別々に作成・削除される | User と Todo |
 * | 異なる更新頻度 | 片方だけが頻繁に更新 | Project と ProjectSettings |
 * | 結果整合性で十分 | 即座の整合性が不要 | 注文 と 在庫 |
 *
 * ## 設計思想
 *
 * **フラットなディレクトリ構造 = 集約を適切なサイズに保つ意思表明**
 *
 * - ディレクトリが深くなる = 集約が大きすぎる兆候
 * - 1ディレクトリ = 1集約 = 1トランザクション境界
 * - ファイル数が多すぎる = 集約分割を検討するサイン
 *
 * @example-good
 * ```typescript
 * // 同一集約: Todo + Attachment
 * // - 強い整合性: Todoの添付ファイル一覧は常に最新
 * // - ライフサイクル: Todoが削除されたらAttachmentも削除
 * export class Todo {
 *   readonly id: string;
 *   readonly attachments: Attachment[]; // 子エンティティを保持
 *
 *   addAttachment(attachment: Attachment): Todo {
 *     return new Todo({
 *       ...this,
 *       attachments: [...this.attachments, attachment],
 *     });
 *   }
 * }
 *
 * // 別集約への参照: ID参照のみ
 * export class Todo {
 *   readonly projectId: string | undefined; // Project集約への参照はIDのみ
 *   readonly assigneeId: string | undefined; // User集約への参照はIDのみ
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ 独立したライフサイクルを同一集約に
 * export class User {
 *   readonly todos: Todo[]; // Userが削除されてもTodoは残るべき
 * }
 *
 * // ❌ 別集約を直接参照
 * export class Todo {
 *   readonly project: Project | undefined; // ID参照にすべき
 * }
 *
 * // ❌ 集約が大きすぎる（深すぎる階層）
 * export class Project {
 *   readonly tasks: Task[];
 *   // Task内にSubTaskがある = 2階層 = 集約が大きすぎる
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

// 別集約を示唆するエンティティ名パターン（これらへの直接参照は避けるべき）
const OTHER_AGGREGATE_PATTERNS = [
  /^User$/,
  /^Project$/,
  /^Organization$/,
  /^Team$/,
  /^Account$/,
  /^Company$/,
];

// ID参照として許容されるプロパティ名パターン
const ID_REFERENCE_PATTERNS = [
  /Id$/,
  /Ids$/,
];

export const policyCheck = createASTChecker({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    const className = node.name?.text ?? "Anonymous";

    // 集約ルートかどうかを判断（ディレクトリ名と一致するか）
    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;

    // domain/model 配下のみ対象
    if (!filePath.includes("/domain/model/")) return;

    // プロパティを走査して、不適切な参照パターンを検出
    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;

      const propName = member.name.text;
      const typeNode = member.type;

      if (typeNode === undefined) continue;

      // 1. 別集約への直接参照をチェック（ID参照でないもの）
      if (ts.isTypeReferenceNode(typeNode)) {
        const {typeName} = typeNode;
        if (ts.isIdentifier(typeName)) {
          const refTypeName = typeName.text;

          // ID参照パターンでなく、別集約の型を参照している場合
          const isIdReference = ID_REFERENCE_PATTERNS.some((p) => p.test(propName));
          const isOtherAggregate = OTHER_AGGREGATE_PATTERNS.some((p) => p.test(refTypeName));

          if (!isIdReference && isOtherAggregate) {
            ctx.report(
              member,
              `エンティティ "${className}" のプロパティ "${propName}" が別集約 "${refTypeName}" を直接参照しています。\n` +
                `■ 別集約への参照はID参照（例: ${propName}Id: string）にしてください。\n` +
                "■ 直接参照すると集約の境界が曖昧になり、トランザクション整合性が損なわれます。"
            );
          }
        }
      }

      // 2. 配列型の場合のチェック
      if (ts.isArrayTypeNode(typeNode)) {
        const {elementType} = typeNode;

        if (ts.isTypeReferenceNode(elementType)) {
          const {typeName} = elementType;
          if (ts.isIdentifier(typeName)) {
            const refTypeName = typeName.text;

            // 2a. 別集約の配列を持っている場合（独立ライフサイクルの兆候）
            const isOtherAggregate = OTHER_AGGREGATE_PATTERNS.some((p) => p.test(refTypeName));
            if (isOtherAggregate) {
              ctx.report(
                member,
                `エンティティ "${className}" が別集約 "${refTypeName}" の配列を保持しています。\n` +
                  "■ 独立したライフサイクルを持つエンティティは別集約とすべきです。\n" +
                  `■ ID参照の配列（例: ${propName}Ids: string[]）を検討してください。`
              );
            }

            // 2b. エンティティ配列を持っている場合（集約サイズの警告）
            // 大文字始まりの型名 = エンティティの可能性が高い
            if (/^[A-Z]/.test(refTypeName) && !isOtherAggregate) {
              // 子エンティティ配列のプロパティ名をチェック
              const expectedSingular = propName.endsWith("s")
                ? propName.slice(0, -1)
                : propName;

              // 型名と変数名の不一致をチェック（ドメイン言語の一貫性）
              if (!refTypeName.toLowerCase().includes(expectedSingular.toLowerCase())) {
                ctx.report(
                  member,
                  `エンティティ "${className}" のプロパティ "${propName}" と型 "${refTypeName}" の命名が一致しません。\n` +
                    "■ ドメイン言語の一貫性のため、プロパティ名は型名に基づいてください。\n" +
                    "■ 例: attachments: Attachment[], items: OrderItem[]"
                );
              }
            }
          }
        }
      }

      // 3. Union型（| undefined）の中の直接参照をチェック
      if (ts.isUnionTypeNode(typeNode)) {
        for (const unionMember of typeNode.types) {
          if (ts.isTypeReferenceNode(unionMember)) {
            const {typeName} = unionMember;
            if (ts.isIdentifier(typeName)) {
              const refTypeName = typeName.text;

              const isIdReference = ID_REFERENCE_PATTERNS.some((p) => p.test(propName));
              const isOtherAggregate = OTHER_AGGREGATE_PATTERNS.some((p) => p.test(refTypeName));

              if (!isIdReference && isOtherAggregate) {
                ctx.report(
                  member,
                  `エンティティ "${className}" のプロパティ "${propName}" が別集約 "${refTypeName}" を直接参照しています。\n` +
                    `■ 別集約への参照はID参照（例: ${propName}Id: string | undefined）にしてください。`
                );
              }
            }
          }
        }
      }
    }
  },
});
