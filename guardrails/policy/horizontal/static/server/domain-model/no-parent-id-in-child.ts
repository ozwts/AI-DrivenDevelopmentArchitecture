/**
 * @what 子エンティティのドメインモデルに親IDが含まれていないか検査
 * @why 親子関係は集約ルートが管理する責務であり、永続化層でマッピングすべき
 * @failure 子エンティティに親IDプロパティを検出した場合にエラー
 *
 * @concept 子エンティティと親IDの分離
 *
 * - **親IDはドメインモデルに不要**: 親子関係は集約ルートが管理する責務
 * - **永続化層でマッピング**: 親子関係はRepository実装でマッピング
 * - **別集約への参照はOK**: `userId`等の別集約IDは許可
 *
 * @example-good
 * ```typescript
 * // 子エンティティには親IDを含めない
 * export class Attachment {
 *   readonly id: string;
 *   readonly fileName: string;
 *   readonly fileSize: number;
 *   readonly contentType: string;
 *   readonly status: AttachmentStatus;
 *   // 親IDは永続化層で管理
 * }
 *
 * export class ProjectMember {
 *   readonly id: string;
 *   readonly userId: string;      // 別集約への参照はOK
 *   readonly role: MemberRole;
 *   // 親IDは永続化層で管理
 * }
 *
 * // 集約ルートで子エンティティを保持
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *   readonly attachments: Attachment[];
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // NG: 子エンティティに親IDを含めている
 * export class Attachment {
 *   readonly id: string;
 *   readonly todoId: string;       // NG: 親IDはドメインモデルに不要
 *   readonly fileName: string;
 * }
 *
 * export class ProjectMember {
 *   readonly id: string;
 *   readonly projectId: string;    // NG: 親IDはドメインモデルに不要
 *   readonly userId: string;
 * }
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { createASTChecker } from "../../../../ast-checker";

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

    // エンティティ名を取得（例: "attachment.entity.ts" → "attachment"）
    const entityName = fileName.replace(".entity.ts", "");

    // ディレクトリ名と一致する場合は集約ルート → チェック不要
    if (entityName === dirName) return;

    // 子エンティティの場合、親ID（ディレクトリ名 + Id）がないかチェック
    const parentIdName = `${dirName  }Id`;

    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;

      const propName = member.name.text;

      if (propName === parentIdName) {
        ctx.report(
          member,
          `子エンティティ "${className}" に親ID "${propName}" を含めることは禁止されています。` +
            "親子関係は集約ルートが管理し、永続化層でマッピングしてください。"
        );
      }
    }
  },
});
