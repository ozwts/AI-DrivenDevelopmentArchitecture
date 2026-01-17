/**
 * @what バリデーション責務のMECE原則（層間責務分担）
 * @why 同じバリデーションを複数箇所で重複実装しないため
 * @failure UseCase層でHandler層・Domain層の責務を実装している場合にエラー
 *
 * @concept バリデーション戦略（MECE原則）
 *
 * | 層       | 責務                           | 実装場所             | 例                             |
 * |----------|--------------------------------|----------------------|--------------------------------|
 * | Handler  | 型レベルバリデーション         | Zodスキーマ          | minLength, maxLength, required |
 * | Domain   | ドメインルール・不変条件       | ValueObject/Entity   | ProjectColor.fromString()      |
 * | UseCase  | ビジネスルール（DB参照必要）   | UseCaseメソッド      | 権限チェック、重複チェック     |
 *
 * **Handler層（Zod）で検証済みのもの:**
 * - 必須性（required）
 * - 型（string, number, boolean）
 * - 長さ（minLength, maxLength）
 * - パターン（email, uuid, date-time）
 * - 列挙（enum）
 * - 数値範囲（minimum, maximum）
 *
 * **Domain層で検証済みのもの:**
 * - 形式制約（カラーコード、URL等）
 * - 値の範囲制約（0-100等）
 * - ドメイン固有のルール
 *
 * **UseCase層で検証すべきもの:**
 * - 権限チェック（DB参照）
 * - リソース存在確認（DB参照）
 * - 重複チェック（DB参照）
 * - 状態遷移ルール（ビジネス文脈）
 *
 * @example-good
 * ```typescript
 * // handler/project-router.ts
 * export const createProjectSchema = z.object({
 *   name: z.string().min(1).max(100),  // ✅ 型レベルはHandlerで
 *   color: z.string().regex(/^#[0-9A-F]{6}$/i),  // ✅ 形式チェックもHandlerで
 * });
 *
 * // domain/project-color.vo.ts
 * export class ProjectColor {
 *   static fromString(value: string): Result<ProjectColor, DomainError> {
 *     // ✅ Handler層で既に形式チェック済み
 *     // ドメイン固有ルールのみ検証（例: 禁止色チェック）
 *     if (FORBIDDEN_COLORS.includes(value)) {
 *       return Result.err(new DomainError("この色は使用できません"));
 *     }
 *     return Result.ok(new ProjectColor(value));
 *   }
 * }
 *
 * // use-case/create-project-use-case.ts
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // ✅ Domain層で検証（型レベルは既にHandler層で検証済み）
 *     const colorResult = ProjectColor.fromString(input.color);
 *     if (colorResult.isErr()) {
 *       return colorResult;
 *     }
 *
 *     // ✅ ビジネスルールのみを検証（DB参照）
 *     const existingResult = await this.#props.projectRepository.findByName({
 *       name: input.name,
 *     });
 *
 *     if (existingResult.data !== undefined) {
 *       return Result.err(new ConflictError("プロジェクト名が重複しています"));
 *     }
 *
 *     // ...
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // use-case/create-project-use-case.ts
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput) {
 *     // ❌ Handler層でZodスキーマで検証済み
 *     if (input.name.length === 0) {
 *       return Result.err(new ValidationError("名前は必須です"));
 *     }
 *
 *     if (input.name.length > 100) {
 *       return Result.err(new ValidationError("名前は100文字以内です"));
 *     }
 *
 *     // ❌ Domain層（ProjectColor.fromString()）で検証済み
 *     if (!/^#[0-9A-F]{6}$/i.test(input.color)) {
 *       return Result.err(new DomainError("カラーコードは#RRGGBB形式です"));
 *     }
 *
 *     // Value Object生成（ここで既に検証される）
 *     const colorResult = ProjectColor.fromString(input.color);
 *     if (colorResult.isErr()) {
 *       return colorResult; // ❌ 上のif文と重複
 *     }
 *
 *     // ...
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // executeメソッドのみチェック
    if (!ts.isMethodDeclaration(node)) return;
    if (!ts.isIdentifier(node.name)) return;
    if (node.name.text !== "execute") return;
    if (node.body === undefined) return;

    const sourceFile = node.getSourceFile();
    const methodText = node.body.getText(sourceFile);

    // パターン1: input.xxx.length チェック（型レベルバリデーション）
    // input.title.length === 0, input.name.length > 100 等
    if (/input\.\w+\.length\s*[<>=!]+\s*\d+/.test(methodText)) {
      ctx.report(
        node,
        "【MECE違反】UseCase層で文字列長チェックを実装しています。\n" +
          "■ ❌ Bad: if (input.name.length === 0) { ... }\n" +
          "■ ✅ Good: Handler層でZodスキーマで検証（z.string().min(1).max(100)）\n" +
          "■ 理由: 型レベルバリデーション（長さ、必須性）はHandler層の責務です。\n" +
          "■ 参照: constitution/structural-discipline/responsibility-principles.md"
      );
    }

    // パターン2: input.xxx === "" または input.xxx === '' （必須性チェック）
    if (
      /input\.\w+\s*===?\s*['"]["']/.test(methodText) ||
      /['"]["']\s*===?\s*input\.\w+/.test(methodText)
    ) {
      ctx.report(
        node,
        "【MECE違反】UseCase層で空文字チェックを実装しています。\n" +
          "■ ❌ Bad: if (input.name === '') { ... }\n" +
          "■ ✅ Good: Handler層でZodスキーマで検証（z.string().min(1)）\n" +
          "■ 理由: 必須性チェックはHandler層の責務です。"
      );
    }

    // パターン3: 正規表現による形式チェック（ドメインルール重複）
    // /pattern/.test(input.xxx) の後に ValueObject.fromString() がある場合
    if (/\.test\s*\(\s*input\.\w+/.test(methodText)) {
      ctx.report(
        node,
        "【MECE違反の可能性】UseCase層で正規表現による形式チェックを実装しています。\n" +
          "■ ❌ Bad: if (!/^#[0-9A-F]{6}$/i.test(input.color)) { ... }\n" +
          "■ ✅ Good: Handler層で検証（Zodのregex）、またはDomain層のValueObjectで検証\n" +
          "■ 理由: 形式チェックはHandler層またはDomain層の責務です。\n" +
          "■ 注意: ValueObject生成前に同じチェックをしている場合は重複です。"
      );
    }

    // パターン4: typeof チェック
    if (/typeof\s+input\.\w+\s*[!=]==?\s*['"]/.test(methodText)) {
      ctx.report(
        node,
        "【MECE違反】UseCase層で型チェックを実装しています。\n" +
          "■ ❌ Bad: if (typeof input.count !== 'number') { ... }\n" +
          "■ ✅ Good: Handler層でZodスキーマで検証（z.number()）\n" +
          "■ 理由: 型チェックはHandler層の責務です。"
      );
    }

    // パターン5: input.xxx === undefined チェック（必須性）
    // ただし、PATCH更新での 'in' 演算子との組み合わせは許可
    if (
      /input\.\w+\s*===?\s*undefined/.test(methodText) &&
      !/['"](\w+)['"]\s+in\s+input/.test(methodText)
    ) {
      ctx.report(
        node,
        "【MECE違反の可能性】UseCase層でundefinedチェックを実装しています。\n" +
          "■ ❌ Bad: if (input.title === undefined) { return Result.err(...) }\n" +
          "■ ✅ Good: Handler層でZodスキーマで検証（required指定）\n" +
          "■ 理由: 必須性チェックはHandler層の責務です。\n" +
          "■ 注意: PATCH更新での'in'演算子との組み合わせ（'title' in input && input.title !== undefined）は許可されます。"
      );
    }

    // パターン6: ValidationError の使用
    // UseCase層でValidationErrorを返している場合、型レベルバリデーションの可能性
    if (/new\s+ValidationError\s*\(/.test(methodText)) {
      ctx.report(
        node,
        "【MECE違反の可能性】UseCase層でValidationErrorを使用しています。\n" +
          "■ ValidationErrorは型レベルバリデーション（Handler層）のエラーです。\n" +
          "■ UseCase層ではDomainError, NotFoundError, ForbiddenError, ConflictError等を使用してください。\n" +
          "■ 理由: 各層で適切なエラー型を使い分けることで、責務が明確化されます。"
      );
    }
  },
});
