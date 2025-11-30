# 集約パターン（Aggregate Pattern）

## 核心原則

集約は**整合性境界**であり、関連するエンティティ群を1つの単位として扱い、**1集約 = 1リポジトリ**で永続化する。

## 関連ドキュメント

| トピック           | ファイル                              |
| ------------------ | ------------------------------------- |
| 永続化パターン     | `../repository/20-aggregate-persistence.md` |
| Entity設計         | `20-entity-overview.md`                     |
| リポジトリIF       | `30-repository-interface-overview.md`       |
| ディレクトリ構成   | `10-domain-model-overview.md`               |

## 設計思想：フラットなディレクトリ構造と集約サイズ

本プロジェクトでは**アグリゲートごとに1ディレクトリ**のフラット構造を採用している。この構造は**集約を適切なサイズに保つ意思表明**である。

### なぜフラット構造か

1. **集約の肥大化を防ぐ**: ディレクトリが深くなる = 集約が大きすぎる兆候
2. **境界の可視化**: 1ディレクトリ = 1集約 = 1トランザクション境界
3. **認知負荷の軽減**: ファイル数が多すぎる場合は集約分割を検討するサイン

## 責務

### 実施すること

1. **整合性境界の定義**: どのエンティティ群を1つの整合性単位とするか
2. **集約ルートの設計**: 外部から参照される唯一のエンティティ
3. **子エンティティの管理**: 集約ルート経由でのみアクセス

### 実施しないこと

1. **永続化の詳細** → Repository実装層
2. **トランザクション管理** → UnitOfWork
3. **技術的制約の露出** → インフラ層

## 設計原則

### 1. 親IDを子エンティティに含めない

子エンティティのドメインモデルには親のIDを含めない。親子関係は永続化層で管理する。

```typescript
// ❌ 子エンティティに親IDを含める
export class Attachment {
  readonly todoId: string; // ドメインモデルには不要
}

// Good
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  // todoIdは永続化層で管理
}
```

### 2. 集約ルートで子エンティティを保持

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly attachments: Attachment[]; // 子エンティティのリスト

  // removeAttachment(): チェック不要 → Todoを直接返す
  removeAttachment(attachmentId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.filter(a => a.id !== attachmentId),
      updatedAt,
    });
  }
}
```

### 3. リポジトリは集約単位で作る

子エンティティ専用のリポジトリは作らない。

```typescript
// Good: 集約ルート単位
export type TodoRepository = {
  todoId(): string;
  attachmentId(): string; // 子エンティティのID生成も提供
  findById(props: { id: string }): Promise<FindByIdResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
};

// ❌ 子エンティティ専用リポジトリ
export type AttachmentRepository = { ... };
```

### 4. 集約のサイズ制限（階層の深さ）

IDの参照関係は**1階層まで**に留める。

```typescript
// Good: 親-子の1階層
Todo (TodoId)
└── Attachment (AttachmentId)

// ❌ 2階層（深すぎる）
Project (ProjectId)
└── Task (TaskId)
    └── SubTask (SubTaskId) // ← 深すぎる
```

### 5. 別の集約への参照はID参照

```typescript
// Good: ID参照
export class Todo {
  readonly projectId: string | undefined;
}

// ❌ オブジェクト参照
export class Todo {
  readonly project: Project | undefined; // 別の集約を直接保持しない
}
```

## 集約の境界

### 1つの集約に含める基準

- **強い整合性が必要**: 同時に更新される必要がある
- **ライフサイクルが同じ**: 親が削除されたら子も削除される
- **同じトランザクション境界**: 同時に保存される

### 別の集約に分ける基準

- **独立したライフサイクル**: 別々に作成・削除される
- **異なる更新頻度**: 片方だけが頻繁に更新される
- **結果整合性で十分**: 即座の整合性が不要

## Do / Don't

### Good

```typescript
// 集約ルートで子エンティティを保持
export class Todo {
  readonly attachments: Attachment[];
}

// 子エンティティに親IDを含めない
export class Attachment {
  readonly id: string;
  readonly fileName: string;
}

// 別の集約へはID参照
export class Todo {
  readonly projectId: string | undefined;
}

// 子エンティティの操作は集約ルート経由
const updated = todo.removeAttachment("att-123", now);
```

### Bad

```typescript
// 子エンティティに親IDを含める
export class Attachment {
  readonly todoId: string; // ❌ ドメインモデルには不要
}

// 別の集約をオブジェクト参照
export class Todo {
  readonly project: Project; // ❌ ID参照にすべき
}

// 子エンティティを直接操作
attachment.update({ fileName: "..." }); // ❌ 集約ルート経由にすべき

// 子エンティティ専用リポジトリ
export type AttachmentRepository = { ... }; // ❌ 親リポジトリに統合
```
