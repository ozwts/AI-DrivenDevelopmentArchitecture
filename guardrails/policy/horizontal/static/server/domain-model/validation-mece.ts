/**
 * @what バリデーション責務のMECE原則（層間責務分担）
 * @why 同じバリデーションを複数箇所で重複実装しないため
 * @failure ドメイン層でHandler層の責務（型レベルバリデーション）を実装している場合にエラー
 *
 * @concept バリデーション戦略（MECE原則）
 *
 * | 層       | 責務                           | エラー型         | HTTPステータス |
 * |----------|--------------------------------|------------------|----------------|
 * | Handler  | 型レベルバリデーション         | ValidationError  | 400            |
 * | Domain   | ドメインルール・不変条件       | DomainError      | 422            |
 * | UseCase  | 外部依存する不変条件           | NotFound/Forbidden | 404/403      |
 *
 * **Handler層（OpenAPI/Zod）で検証すべきもの:**
 * - 必須性（required）
 * - 型（string, number, boolean）
 * - 長さ（minLength, maxLength）
 * - パターン（format: email, uuid, date-time）
 * - 列挙（enum）
 * - 数値範囲（minimum, maximum）
 *
 * **Domain層で検証すべきもの:**
 * - OpenAPIで表現不可能な複雑なルール（会社ドメインのみのEmail等）
 * - 状態遷移ルール（完了済みからは変更不可等）
 * - 複数値の関係性（完了TODOは期限必須等）
 *
 * @example-good
 * ```typescript
 * // Domain層: ビジネスルールのみ検証
 * export class TodoStatus {
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     // 有効な値かどうか（OpenAPIのenumでは表現しきれない遷移ルールがある）
 *     if (!validStatuses.includes(props.status)) {
 *       return Result.err(new DomainError("無効なステータス"));
 *     }
 *     return Result.ok(new TodoStatus(props.status));
 *   }
 *
 *   canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> {
 *     // 状態遷移ルール（ビジネスルール）
 *     if (this.isCompleted() && !newStatus.isCompleted()) {
 *       return Result.err(new DomainError("完了済みからは変更不可"));
 *     }
 *     return Result.ok(undefined);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // Domain層で型レベルバリデーション（Handler層の責務）
 * export class Todo {
 *   static from(props: TodoProps): Result<Todo, DomainError> {
 *     // ❌ 長さチェックはHandler層でOpenAPI/Zodが実施済み
 *     if (props.title.length === 0) {
 *       return Result.err(new DomainError("タイトルは必須"));
 *     }
 *     if (props.title.length > 100) {
 *       return Result.err(new DomainError("タイトルは100文字以内"));
 *     }
 *     // ❌ 正規表現パターンチェックもHandler層の責務
 *     if (!/^[\w-]+$/.test(props.id)) {
 *       return Result.err(new DomainError("IDの形式が不正"));
 *     }
 *     return Result.ok(new Todo(props));
 *   }
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    // クラス全体のメソッドをチェック
    if (!ts.isMethodDeclaration(node)) return;
    if (!ts.isIdentifier(node.name)) return;
    if (!node.body) return;

    const methodName = node.name.text;
    const sourceFile = node.getSourceFile();
    const methodText = node.body.getText(sourceFile);

    // 1. .length チェックを検出（配列も含めて警告）
    if (/\.length\s*[<>=!]+\s*\d+/.test(methodText) || /\.length\s*===?\s*0/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で .length チェックを検出しました。\n` +
          `■ 文字列長チェック（minLength/maxLength）はHandler層（OpenAPI/Zod）の責務です。\n` +
          `■ 配列長チェックが必要な場合は、ビジネスルールとして妥当か確認してください。`
      );
    }

    // 2. 正規表現テスト .test() を検出
    if (/\.test\s*\(/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で正規表現テスト（.test()）を検出しました。\n` +
          `■ 形式チェック（email, uuid, pattern等）はHandler層（OpenAPI format/pattern）の責務です。\n` +
          `■ ドメイン固有ルール（会社ドメインのみ等）の場合はこの警告を無視できます。`
      );
    }

    // 3. 正規表現リテラル /.../ を検出
    if (/\/[^/]+\/[gimsuy]*\./.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で正規表現リテラルを検出しました。\n` +
          `■ 形式チェックはHandler層（OpenAPI format/pattern）の責務です。`
      );
    }

    // 4. typeof チェックを検出
    if (/typeof\s+\w+\s*[!=]==?\s*['"]/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で typeof チェックを検出しました。\n` +
          `■ 型チェックはHandler層（OpenAPI/Zod）の責務です。\n` +
          `■ Domain層では型は既にバリデーション済みとして扱ってください。`
      );
    }

    // 5. Number.isNaN, isFinite 等の数値チェック
    if (/Number\.(isNaN|isFinite|isInteger)/.test(methodText) || /isNaN\(/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で数値バリデーション（isNaN/isFinite等）を検出しました。\n` +
          `■ 数値形式チェックはHandler層（OpenAPI type: number）の責務です。`
      );
    }

    // 6. 空文字チェック === '' または === ""
    if (/===?\s*['"]["']/.test(methodText) || /['"]["']\s*===?/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で空文字チェックを検出しました。\n` +
          `■ 必須性チェック（minLength: 1）はHandler層（OpenAPI/Zod）の責務です。`
      );
    }

    // 7. trim() の使用
    if (/\.trim\(\)/.test(methodText)) {
      ctx.report(
        node,
        `【MECE違反の可能性】メソッド "${methodName}" 内で .trim() を検出しました。\n` +
          `■ 入力値の正規化はHandler層の責務です。\n` +
          `■ Domain層に到達するデータは正規化済みであるべきです。`
      );
    }
  },
});
