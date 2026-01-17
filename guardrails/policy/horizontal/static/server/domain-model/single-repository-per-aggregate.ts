/**
 * @what 1アグリゲート = 1リポジトリの原則を検査（ディレクトリ名と一致するリポジトリのみ許可）
 * @why 集約の整合性境界を維持するため、アグリゲートディレクトリには対応するリポジトリのみ配置すべき
 * @failure アグリゲートディレクトリ名と一致しないリポジトリを検出した場合にエラー
 *
 * @concept 集約パターン（1集約 = 1リポジトリ = 1ディレクトリ）
 *
 * - **整合性境界**: 集約は整合性境界であり、関連エンティティ群を1つの単位として扱う
 * - **フラット構造**: アグリゲートごとに1ディレクトリ（深いネストは集約が大きすぎる兆候）
 * - **子エンティティ**: 集約ルート経由でのみアクセス・永続化（専用リポジトリ禁止）
 *
 * @example-good
 * ```
 * {aggregate}/
 * ├── {aggregate}.entity.ts
 * ├── {aggregate}.repository.ts  # ✅ ディレクトリ名と一致
 * ├── {child}.entity.ts          # 子エンティティ（リポジトリなし）
 * └── {value-object}.vo.ts
 * ```
 *
 * @example-bad
 * ```
 * {aggregate}/
 * ├── {aggregate}.entity.ts
 * ├── {aggregate}.repository.ts
 * ├── {child}.entity.ts
 * └── {child}.repository.ts      # ❌ ディレクトリ名と不一致（子エンティティ専用リポジトリは禁止）
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.repository\.ts$/,

  visitor: (node, ctx) => {
    // ファイルレベルでチェック（SourceFileノードを利用）
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;
    const filePath = sourceFile.fileName;
    const fileName = path.basename(filePath);

    // リポジトリファイル名からエンティティ名を取得
    const repoEntityName = fileName.replace(".repository.ts", "");

    // ディレクトリ名を取得
    const dirName = path.basename(path.dirname(filePath));

    // ディレクトリ名とリポジトリ名が一致しない場合はエラー
    if (repoEntityName !== dirName) {
      ctx.report(
        node,
        `リポジトリ "${fileName}" はアグリゲートディレクトリ "${dirName}" と一致しません。` +
          `1アグリゲート = 1リポジトリの原則に従い、"${dirName}.repository.ts" のみ配置してください。` +
          "子エンティティは集約ルートのリポジトリ経由で永続化します。"
      );
    }
  },
});
