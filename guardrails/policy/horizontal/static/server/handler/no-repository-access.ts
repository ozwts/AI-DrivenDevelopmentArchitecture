/**
 * @what ハンドラーからのRepository直接アクセス禁止チェック
 * @why ハンドラー層の責務を薄いアダプターに限定し、データアクセスをUseCase層に委譲するため
 * @failure ハンドラー内でRepositoryを直接使用している場合にエラー
 *
 * @concept ハンドラーからのRepository直接アクセス禁止
 *
 * ハンドラーは**Repositoryを直接呼び出してはならない**。
 * データアクセスはUseCase層の責務であり、ハンドラーはUseCaseを通じてのみデータにアクセスする。
 *
 * **理由:**
 * - ハンドラーを薄いアダプターに保つ
 * - ビジネスロジックをUseCase層に集約する
 * - トランザクション境界を明確にする
 * - テスト容易性を確保する
 *
 * @example-good
 * ```typescript
 * export const buildGetProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const useCase = container.get<GetProjectUseCase>(serviceId.GET_PROJECT_USE_CASE);
 *
 *     // UseCaseを通じてデータにアクセス
 *     const result = await useCase.execute({ projectId });
 *     // ...
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildGetProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     // ❌ Repositoryを直接取得
 *     const repository = container.get<ProjectRepository>(serviceId.PROJECT_REPOSITORY);
 *     // ❌ Repositoryを直接呼び出し
 *     const result = await repository.findById({ id: projectId });
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    const sourceFile = node.getSourceFile();

    // 1. Repository型の変数宣言を検出
    if (ts.isVariableDeclaration(node)) {
      if (node.type !== undefined) {
        const typeText = node.type.getText(sourceFile);
        if (/Repository/.test(typeText)) {
          const varName = ts.isIdentifier(node.name) ? node.name.text : "variable";
          ctx.report(
            node,
            `ハンドラー内でRepository型の変数 "${varName}" が宣言されています。\n` +
              "■ ハンドラーからRepositoryに直接アクセスすることは禁止されています。\n" +
              "■ データアクセスはUseCase層に委譲してください。"
          );
        }
      }
    }

    // 2. Repository系メソッド呼び出しを検出
    if (ts.isCallExpression(node)) {
      const {expression} = node;
      if (ts.isPropertyAccessExpression(expression)) {
        const methodName = expression.name.text;
        const objectText = expression.expression.getText(sourceFile);

        // repository.findById等のパターンを検出
        if (/[Rr]epository/.test(objectText)) {
          if (/^(findById|findBy\w+|findAll|save|remove|delete)$/.test(methodName)) {
            ctx.report(
              node,
              `ハンドラー内でRepository.${methodName}()が呼び出されています。\n` +
                "■ ハンドラーからRepositoryに直接アクセスすることは禁止されています。\n" +
                "■ データアクセスはUseCase層に委譲してください。"
            );
          }
        }
      }
    }

    // 3. import文でRepositoryをインポートしていないかチェック
    if (ts.isImportDeclaration(node)) {
      const {importClause} = node;
      if (importClause !== undefined) {
        const importText = importClause.getText(sourceFile);
        if (/Repository/.test(importText)) {
          ctx.report(
            node,
            "ハンドラーファイルでRepositoryがインポートされています。\n" +
              "■ ハンドラーからRepositoryに直接アクセスすることは禁止されています。\n" +
              "■ データアクセスはUseCase層に委譲してください。"
          );
        }
      }
    }
  },
});
