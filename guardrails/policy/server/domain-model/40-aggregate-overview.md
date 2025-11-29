# 集約パターン（Aggregate Pattern）

## 核心原則

集約は**整合性境界**であり、関連するエンティティ群を1つの単位として扱い、ドメインの不変条件を保護する。

**関連ドキュメント**:
- **永続化パターン**: `../repository/20-aggregate-persistence.md` - 集約の永続化実装
- **Entity設計**: `20-entity-overview.md`
- **Repository Interface**: `30-repository-interface-overview.md`

## 責務

### 実施すること

1. **整合性境界の定義**: どのエンティティ群を1つの整合性単位とするか
2. **集約ルートの設計**: 外部から参照される唯一のエンティティ
3. **子エンティティの管理**: 集約ルート経由でのみアクセス
4. **不変条件の保護**: 集約内の整合性を保証

### 実施しないこと

1. **永続化の詳細** → Repository実装層（`../repository/20-aggregate-persistence.md`）
2. **トランザクション管理** → Infrastructure層（UnitOfWork）
3. **技術的制約の露出** → インフラ層（DynamoDB制約等）

## 基本概念

### 集約ルート（Aggregate Root）

外部から参照される唯一のエンティティ。集約内の不変条件を保護する責務を持つ。

**例:** `Todo`エンティティが集約ルート

### 子エンティティ

集約ルート経由でのみアクセスされる。外部から直接参照されない。

**例:** `Attachment`エンティティはTodoの子エンティティ

## 設計原則

### 1. 親IDを子エンティティに含めない

子エンティティのドメインモデルには親のIDを含めない。親子関係は永続化層で管理する。

```typescript
// ❌ Bad: 子エンティティに親IDを含める
export class Attachment {
  readonly id: string;
  readonly todoId: string; // ドメインモデルには不要
  readonly fileName: string;
}

// ✅ Good: 親IDは含めない
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  // todoIdは永続化層で管理（DynamoDBのPK/SK等）
}
```

**理由:**
- ドメインモデルに永続化の技術的詳細を持ち込まない
- 親子関係は永続化の実装詳細

### 2. 集約ルートで子エンティティを保持

集約ルートは子エンティティのリストを持ち、整合性を保証する。

```typescript
export type TodoProps = {
  id: string;
  title: string;
  attachments: Attachment[];  // 子エンティティのリスト
  createdAt: string;
  updatedAt: string;
};

export class Todo {
  readonly id: string;
  readonly title: string;
  readonly attachments: Attachment[];

  constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.attachments = props.attachments;
    // 不変条件チェック（例: 添付ファイル数上限）
  }
}
```

### 3. 子エンティティの更新は集約ルート経由

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

  /**
   * 添付ファイルを追加して新しいTodoインスタンスを返す
   */
  addAttachment(attachment: Attachment, updatedAt: string): Todo {
    return new Todo({
      ...this,
      attachments: [...this.attachments, attachment],
      updatedAt,
    });
  }
}
```

### 4. リポジトリは集約単位で作る

**1集約 = 1リポジトリ**の原則に従う。子エンティティ専用のリポジトリは作らない。

```typescript
// ✅ Good: 集約ルート単位でリポジトリを作る
export type TodoRepository = {
  todoId(): string;
  attachmentId(): string;  // 子エンティティのID生成も集約ルートリポジトリで提供
  findById(props: { id: string }): Promise<FindByIdResult>;
  save(props: { todo: Todo }): Promise<SaveResult>;
  remove(props: { id: string }): Promise<RemoveResult>;
};

// ❌ Bad: 子エンティティ専用のリポジトリを作らない
export type AttachmentRepository = {
  save(props: { attachment: Attachment }): Promise<SaveResult>;
};
```

**理由:**
- 集約の整合性を保証（親と子が同じトランザクションで保存される）
- リポジトリの数を減らし、保守性を向上
- 集約境界を明確にする

### 5. 集約のサイズ制限（階層の深さ）

集約の巨大化を防ぐため、**IDの参照関係は1階層まで**に留める。

**階層の定義**: エンティティのID参照の深さ
- 1階層: `TodoId` → `AttachmentId`（適切な集約）
- 2階層: `ProjectId` → `TaskId` → `SubTaskId`（深すぎる）

```typescript
// ✅ Good: 親-子の1階層（ID参照が1段階）
Todo (TodoId)
└── Attachment (AttachmentId)  // TodoIdを参照（1階層）

// ❌ Bad: 親-子-孫の2階層（ID参照が2段階、集約が大きすぎる）
Project (ProjectId)
└── Task (TaskId)        // ProjectIdを参照（1階層）
    └── SubTask (SubTaskId)  // TaskIdを参照（2階層目）← 深すぎる
```

**2階層になりそうな場合の対処:**

**別の集約に分離する**（ID参照に変更）

```typescript
// 分離前（2階層）
Project (ProjectId)
└── Task (TaskId)        // ProjectIdを参照
    └── SubTask (SubTaskId)  // TaskIdを参照 ← 2階層目

// 分離後（それぞれ1階層）
Project (ProjectId)       // 集約1
└── Task (TaskId)         // ProjectIdを参照（1階層）

Task (TaskId)             // 集約2（別の集約として扱う）
└── SubTask (SubTaskId)   // TaskIdを参照（1階層）
```

**この場合、Taskは2つの役割を持つ:**
- Project集約の子エンティティ（Projectから見た場合）
- Task集約の集約ルート（SubTaskから見た場合）

**重要:** この設計は複雑になるため、可能であれば**設計を見直す**（SubTaskは本当に必要か？Taskの配列で代替できないか？）

**理由:**
- トランザクション境界を小さく保つ
- パフォーマンスの劣化を防ぐ
- 集約の複雑性を抑える
- ID参照の深さが増すほど、整合性管理が困難になる

## 集約の境界

### 1つの集約に含める基準

- **強い整合性が必要**: 同時に更新される必要がある
- **ライフサイクルが同じ**: 親が削除されたら子も削除される
- **参照の方向**: 親 → 子の一方向のみ
- **トランザクション境界**: 同じトランザクションで更新される

### 別の集約に分ける基準

- **独立したライフサイクル**: 別々に作成・削除される
- **異なる更新頻度**: 片方だけが頻繁に更新される
- **双方向の参照**: お互いに参照し合う関係
- **結果整合性で十分**: 即座の整合性が不要

**例:**

```typescript
// ✅ Todo と Attachment は同じ集約
// - Todoが削除されたらAttachmentも削除される
// - 同時に更新される必要がある
// - 強い整合性が必要

// ✅ Todo と Project は別の集約
// - 独立したライフサイクル
// - Projectは複数のTodoから参照される
// - TodoはprojectIdで参照するのみ（ID参照）
```

## 実装パターン

### 集約ルート

```typescript
export type TodoProps = {
  id: string;
  title: string;
  projectId: string | undefined;  // 別の集約への参照（ID参照）
  attachments: Attachment[];      // 子エンティティ（オブジェクト参照）
  createdAt: string;
  updatedAt: string;
};

export class Todo {
  readonly id: string;
  readonly title: string;
  readonly projectId: string | undefined;
  readonly attachments: Attachment[];
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: TodoProps) {
    this.id = props.id;
    this.title = props.title;
    this.projectId = props.projectId;
    this.attachments = props.attachments;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * 子エンティティの操作
   */
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
export type AttachmentProps = {
  id: string;
  fileName: string;
  storageKey: string;
  contentType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
};

export class Attachment {
  readonly id: string;
  readonly fileName: string;
  readonly storageKey: string;
  readonly contentType: string;
  readonly fileSize: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  // todoId は含めない（永続化層で管理）

  constructor(props: AttachmentProps) {
    this.id = props.id;
    this.fileName = props.fileName;
    this.storageKey = props.storageKey;
    this.contentType = props.contentType;
    this.fileSize = props.fileSize;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
```

## 他の集約への参照

### ID参照パターン

別の集約を参照する場合は、オブジェクト参照ではなくID参照を使用する。

```typescript
// ✅ Good: ID参照
export class Todo {
  readonly projectId: string | undefined;  // ProjectのID
}

// ❌ Bad: オブジェクト参照
export class Todo {
  readonly project: Project | undefined;  // 別の集約を直接保持しない
}
```

**理由:**
- 集約の境界を明確にする
- トランザクション境界を明確にする
- 循環参照を防ぐ

## Do / Don't

### ✅ Good

```typescript
// 集約ルートで子エンティティを保持
export class Todo {
  readonly attachments: Attachment[];
}

// 子エンティティに親IDを含めない
export class Attachment {
  readonly id: string;
  readonly fileName: string;
  // todoIdは含めない
}

// 別の集約へはID参照
export class Todo {
  readonly projectId: string | undefined;
}

// 子エンティティの操作は集約ルート経由
const updatedTodo = todo.removeAttachment("att-123", now);
```

### ❌ Bad

```typescript
// 子エンティティに親IDを含める
export class Attachment {
  readonly todoId: string;  // ドメインモデルには不要
}

// 別の集約をオブジェクト参照
export class Todo {
  readonly project: Project;  // ID参照にすべき
}

// 子エンティティを直接操作
attachment.update({ fileName: "新しい名前" });  // 集約ルート経由にすべき
```

## チェックリスト

```
[ ] 集約の境界を明確に定義している
[ ] 集約ルートが整合性を保護している
[ ] 子エンティティに親IDを含めていない
[ ] 子エンティティの操作は集約ルート経由
[ ] 別の集約へはID参照を使用
[ ] 集約内の不変条件を保証している
[ ] ライフサイクルが同じエンティティのみ集約内に含めている
[ ] リポジトリは集約単位で作成（1集約 = 1リポジトリ）
[ ] 子エンティティ専用のリポジトリを作っていない
[ ] 親子関係は1階層まで（孫エンティティは作らない）
[ ] 2階層になる場合は集約を分割またはValue Object化
```
