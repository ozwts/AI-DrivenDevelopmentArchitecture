# 集約パターン（Aggregate Pattern）

## 概要

関連するエンティティ群を1つの集約として扱い、整合性を保つ設計パターン。

## 基本概念

### 集約ルート（Aggregate Root）

外部から参照される唯一のエンティティ。

**例:** `Todo`エンティティが集約ルート

### 子エンティティ

集約ルート経由でのみアクセスされる。

**例:** `Attachment`エンティティはTodoの子エンティティ

## 設計原則

### 1. 親IDを子エンティティに含めない

子エンティティのドメインモデルには親のIDを含めない。親子関係はリポジトリ層（DynamoDB等）で管理する。

```typescript
// ❌ 間違い: 子エンティティに親IDを含める
export class Attachment {
  readonly id: string;
  readonly todoId: string; // ドメインモデルには不要
  readonly fileName: string;
}

// ✅ 正しい: 親IDは含めない
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  // todoIdはインフラ層で管理（DynamoDBのSK等）
}
```

**理由:**

- ドメインモデルに技術的詳細（DynamoDBのパーティションキー/ソートキー構造）を持ち込まない
- 親子関係はリポジトリの実装詳細

### 2. 集約ルートで子エンティティを保持

集約ルートは子エンティティのリストを持つ。

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  // ...
  readonly attachments: Attachment[]; // 子エンティティのリスト
}
```

### 3. 集約単位での保存

リポジトリの`save()`メソッドは、集約ルートと子エンティティをまとめて保存する。

```typescript
export type TodoRepository = {
  /**
   * TODOを保存する（子エンティティも含めて保存）
   */
  save(props: { todo: Todo }): Promise<SaveResult>;
};

// 使用例
const todo = new Todo({
  id: "todo-123",
  title: "タスク",
  attachments: [attachment1, attachment2], // 子エンティティも含む
  // ...
});

await todoRepository.save({ todo }); // 一括保存
```

### 4. 子エンティティ専用リポジトリは作らない

基本的に子エンティティ専用のリポジトリは作らず、親の集約ルートリポジトリに統合する。

```typescript
// ❌ 間違い: 子エンティティ専用リポジトリ
export type AttachmentRepository = {
  save(props: { attachment: Attachment }): Promise<SaveResult>;
};

// ✅ 正しい: 親リポジトリで管理
export type TodoRepository = {
  save(props: { todo: Todo }): Promise<SaveResult>;
  // Todoのattachmentsも一緒に保存される
};
```

**例外:** パフォーマンス上の懸念がある場合は、個別のメソッドを追加することも可能。

```typescript
export type TodoRepository = {
  // 基本の保存（集約全体）
  save(props: { todo: Todo }): Promise<SaveResult>;

  // 個別操作（パフォーマンス最適化）
  addAttachment(props: {
    todoId: string;
    attachment: Attachment;
  }): Promise<SaveResult>;

  removeAttachment(props: {
    todoId: string;
    attachmentId: string;
  }): Promise<RemoveResult>;
};
```

### 5. 子エンティティの更新は集約ルート経由

子エンティティの追加・削除は、集約ルートのメソッドを通じて行う。

```typescript
export class Todo {
  readonly attachments: Attachment[];

  /**
   * 添付ファイルを削除して新しいTodoインスタンスを返す
   */
  removeAttachment(attachmentId: string, updatedAt: string): Todo {
    const updatedAttachments = this.attachments.filter(
      (attachment) => attachment.id !== attachmentId,
    );

    return new Todo({
      ...this,
      attachments: updatedAttachments,
      updatedAt,
    });
  }
}

// 使用例
const updatedTodo = todo.removeAttachment("att-123", now);
await todoRepository.save({ todo: updatedTodo });
```

## 集約の境界

### 1つの集約に含める基準

- **強い整合性が必要**: 同時に更新される必要がある
- **ライフサイクルが同じ**: 親が削除されたら子も削除される
- **参照の方向**: 親 → 子の一方向のみ

### 別の集約に分ける基準

- **独立したライフサイクル**: 別々に作成・削除される
- **異なる更新頻度**: 片方だけが頻繁に更新される
- **双方向の参照**: お互いに参照し合う関係

**例:**

```typescript
// Todo と Attachment は同じ集約
// - Todoが削除されたらAttachmentも削除
// - 同時に更新される

// Todo と Project は別の集約
// - 独立したライフサイクル
// - TodoはprojectIdで参照するのみ
```

## 実装例

### 集約ルート

```typescript
export class Todo {
  readonly id: string;
  readonly title: string;
  readonly projectId: string | undefined; // 別の集約への参照
  readonly attachments: Attachment[]; // 子エンティティ

  constructor(props: {
    id: string;
    title: string;
    projectId?: string;
    attachments?: Attachment[];
    // ...
  }) {
    this.id = props.id;
    this.title = props.title;
    this.projectId = props.projectId;
    this.attachments = props.attachments ?? [];
  }

  // 子エンティティの操作
  removeAttachment(attachmentId: string, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: this.attachments.filter((a) => a.id !== attachmentId),
      updatedAt,
    });
  }
}
```

### 子エンティティ

```typescript
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  // todoId は含めない（リポジトリ層で管理）

  constructor(props: { id: string; fileName: string; storageKey: string }) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.storageKey = props.storageKey;
  }
}
```
