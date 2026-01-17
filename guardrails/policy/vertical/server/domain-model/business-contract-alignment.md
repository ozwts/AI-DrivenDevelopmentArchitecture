# ビジネス契約との整合性検証（Vertical）

## 概要

**縦のガードレール（Vertical）**: 機能単位（Todo/Project/User等）で4層を貫く**ビジネス契約との整合性検証**

このポリシーは、ドメインモデルが `contracts/business` から正しく導出されているかを検証する。

**検証タイミング**: qualitativeレビュー（`mcp__guardrails__review_qualitative`）

---

## 参照先

- 用語集: `contracts/business/glossary.md`
- 定義: `contracts/business/{domain}/definition.md`
- シナリオ: `contracts/business/{domain}/scenario/*.md`

---

## 検証項目

### 1. 用語の一致（Ubiquitous Language）

| 確認項目 | 確認方法 |
|----------|----------|
| Entity名 | 用語集の「英語名」と一致しているか |
| Value Object名 | 用語集の概念から導出されているか |
| プロパティ名 | 定義の「属性」と対応しているか |
| メソッド名 | シナリオの「目的」と対応しているか |

#### Good

```typescript
// 用語集: TODO → Todo, TODOステータス → Todo Status
export class Todo { ... }
export class TodoStatus { ... }

// シナリオ「TODOを登録する」→ registerTodo
// シナリオ「TODOを更新する」→ updateTodo
// シナリオ「ファイルを添付する」→ attachFile
```

#### Bad

```typescript
// 用語集と異なる命名
export class Task { ... }       // 用語集には「TODO」
export class TodoState { ... }  // 用語集には「TODOステータス」

// シナリオと異なる命名
createTodo()  // シナリオは「登録する」
modifyTodo()  // シナリオは「更新する」
```

---

### 2. 属性の一致

定義の「属性」セクションに記載された属性がEntityに反映されているか確認する。

#### Good

```typescript
// contracts/business/todo/definition.md の属性:
// - タイトル：TODOの概要
// - 説明：詳細な内容
// - TODOステータス：進捗状況（未着手、作業中、完了）
// - 優先度：重要度（低、中、高）

export class Todo {
  readonly title: string;           // タイトル
  readonly description?: string;    // 説明
  readonly status: TodoStatus;      // TODOステータス
  readonly priority: Priority;      // 優先度
}
```

#### Bad

```typescript
// 属性が不足している
export class Todo {
  readonly title: string;
  // status が欠落 → ビジネス契約と不整合
}

// 属性名がビジネス契約と異なる
export class Todo {
  readonly name: string;  // 「タイトル」ではなく「名前」
}
```

---

### 3. 制約の一致

定義の「制約」セクションに記載されたルールがValue ObjectまたはEntityに実装されているか確認する。

#### Good

```typescript
// contracts/business/todo/definition.md の制約:
// - タイトルは必須
// - 担当者は必須（デフォルトは作成者）
// - 添付ステータスは準備完了からアップロード完了への一方向のみ遷移可能

// 制約がValue Objectに実装されている
export class AttachmentStatus {
  canTransitionTo(newStatus: AttachmentStatus): Result<void, DomainError> {
    // 一方向遷移のみ許可
    if (this.isUploadCompleted()) {
      return Result.err(new DomainError("アップロード完了後は変更できません"));
    }
    return Result.ok(undefined);
  }
}
```

#### Bad

```typescript
// 制約が実装されていない
export class AttachmentStatus {
  // canTransitionTo がない → 状態遷移ルールが強制されない
}

// 制約がビジネス契約と異なる
export class AttachmentStatus {
  canTransitionTo(newStatus: AttachmentStatus): Result<void, DomainError> {
    // 全遷移を許可 → ビジネス契約「一方向のみ」に違反
    return Result.ok(undefined);
  }
}
```

---

### 4. 4層の一貫性

Contract → Domain → UseCase → Handler の4層でユビキタス言語が一貫しているか確認する。

| 層 | 確認項目 |
|----|----------|
| Contract | `contracts/business/` のシナリオ名 |
| Domain | Entity/Value Objectの名前・メソッド名 |
| UseCase | UseCase名（`{Action}{Entity}UseCase`） |
| Handler | エンドポイント名（`POST /todos`等） |

#### Good

```
シナリオ: 「TODOを登録する」
  ↓
Domain: Todo.from(props)
  ↓
UseCase: RegisterTodoUseCase
  ↓
Handler: POST /todos → registerTodoHandler
```

#### Bad

```
シナリオ: 「TODOを登録する」
  ↓
Domain: Todo.create(props)     // 「登録」ではなく「作成」
  ↓
UseCase: CreateTodoUseCase     // 「登録」ではなく「作成」
  ↓
Handler: POST /todos → createTodoHandler  // 不一致
```

---

## 検証方法

縦のガードレールは**カスタムlintでは実装しない**。以下の方法で検証する：

1. **qualitativeレビュー**: `mcp__guardrails__review_qualitative` で定性的に検証
2. **コードレビュー**: PRレビュー時にビジネス契約との整合性を確認
3. **専用検証ツール**: 将来的にビジネス契約ファイルとの照合ツールを開発可能

---

## 関連ドキュメント

- 横のガードレール: `guardrails/policy/horizontal/static/server/domain-model/`
- ビジネス契約: `contracts/business/`
- API契約: `contracts/api/`
