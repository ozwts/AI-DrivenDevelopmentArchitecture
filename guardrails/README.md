# Guardrails - 三権分立システム

AIが自走するガードレールに三権分立の概念を導入したシステムです。

## 概要

```
Constitution（憲法: 最高原則）
    ↓
Policy（立法: ルール定義）
    ↓ [MCPサーバーが並列読み込み]
Review（司法: Claude Agent SDKで審査実行）
    ↓ [レビュー結果を返す]
```

## ディレクトリ構造

```
guardrails/
├── package.json          # ビルド設定
├── tsconfig.json         # TypeScript設定
├── index.ts              # MCPサーバー（統合エントリーポイント）
├── constitution/         # 憲法（最高原則・価値・法令・倫理）
├── policy/              # 立法（憲法を具体化したルール群）
│   └── web/
│       └── test-strategy/
│           ├── 10-test-strategy-overview.md
│           ├── 20-component-test.md
│           └── 30-snapshot-test.md
├── review/              # 司法（Policyに従って審査するシステム）
│   └── web/
│       └── test-strategy/
│           ├── review-executor.ts    # レビュー準備
│           ├── policy-loader.ts      # ポリシー並列読み込み
│           └── parallel-reviewer.ts  # 並列レビュー実行（Claude Tool Use）
└── procedure/           # 行政（Policyに従って動く実行・オペレーション）
```

## 三権分立の対応

| 役割       | フォルダ        | 説明                                     | 担当     |
| ---------- | --------------- | ---------------------------------------- | -------- |
| 憲法       | constitution/   | 最高原則・価値・法令・倫理               | 人間     |
| 立法       | policy/         | 憲法を具体化したルール群                 | 人間     |
| 司法       | review/         | Policyに従って審査するシステム（MCP）    | AI       |
| 行政       | procedure/      | Policyに従って動く実行・オペレーション   | AI/人間  |

## セットアップ

### 1. 依存関係のインストール

```bash
cd guardrails
npm install
```

### 2. ビルド

```bash
npm run build
```

### 3. 環境変数の設定

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

### 4. Claude Desktop設定

`~/Library/Application Support/Claude/claude_desktop_config.json` に以下を追加：

```json
{
  "mcpServers": {
    "guardrails": {
      "command": "node",
      "args": [
        "/Users/your-username/path/to/guardrails/dist/index.js"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 使い方

### MCPツール1: `review_with_policy`

ファイル種別に応じて適切なポリシーを自動選択し、**並列で読み込んで**レビュー指示を生成します。

#### 入力

```json
{
  "targetFilePath": "/path/to/TodoForm.ct.test.tsx"
}
```

#### 処理フロー

1. **ファイル種別を判定**（.ct.test.tsx / .ss.test.ts）
2. **ポリシーを選択**
   - コンポーネントテスト → `10-overview.md` + `20-component.md`
   - スナップショットテスト → `10-overview.md` + `30-snapshot.md`
3. **ポリシーを並列読み込み**（Promise.all）
4. **レビュー指示を生成**

### MCPツール2: `review_files_parallel` ⭐ 新機能

**複数ファイルを並列でレビュー**し、結果をまとめて返します。Claude Agent SDKを使用して実際にレビューを実行します。

#### 入力

```json
{
  "targetFilePaths": [
    "/path/to/TodoForm.ct.test.tsx",
    "/path/to/TodoCard.ct.test.tsx",
    "/path/to/ProjectForm.ct.test.tsx"
  ]
}
```

#### 処理フロー

1. **各ファイルを並列処理**（Promise.all）
   - ファイル種別判定
   - ポリシー選択・並列読み込み
   - Claude APIでレビュー実行
2. **結果を集約**
   - 成功/失敗のカウント
   - 各ファイルのレビュー結果
3. **整形して返す**

#### 出力例

```markdown
# Parallel Review Results

## Summary

- Total files: 3
- Successful: 3
- Failed: 0

---

## File 1: /path/to/TodoForm.ct.test.tsx

### Policies Applied

- 10-test-strategy-overview.md
- 20-component-test.md

### Review

[Claudeによるレビュー内容]
...

---

## File 2: /path/to/TodoCard.ct.test.tsx

...
```

## ファイル種別とポリシーの対応

| ファイル種別       | 選択されるポリシー（並列読み込み）                           |
| ------------------ | ------------------------------------------------------------ |
| `*.ct.test.tsx`    | `10-test-strategy-overview.md` + `20-component-test.md`      |
| `*.ss.test.ts`     | `10-test-strategy-overview.md` + `30-snapshot-test.md`       |

**重要**:
- 一つのツールは、一つの律法（policy/web/test-strategy/）のフォルダ内のファイルを並列で読み込みます
- コンポーネントテストのポリシーはスナップショットテストに適用されません（逆も同様）
- `review_files_parallel` では、各ファイルが個別にポリシーを選択されます

## 使用例

### 単一ファイルのレビュー準備（手動実行用）

```bash
# MCPツールで指示を取得
curl -X POST ... review_with_policy

# 取得した指示をClaude Codeで実行
```

### 複数ファイルの並列レビュー（自動実行）

```bash
# MCPツールが自動でClaude APIを呼び出してレビュー実行
curl -X POST ... review_files_parallel
```

## 拡張方法

### 新しいポリシーの追加

1. `policy/web/test-strategy/` に新しいポリシーファイルを追加（例: `15-xxx.md`）
2. `review/web/test-strategy/policy-loader.ts` のロジックを更新

### 新しいファイルタイプのサポート

`review/web/test-strategy/policy-loader.ts` の `selectPolicies()` 関数に条件を追加：

```typescript
if (fileName.endsWith(".new-type.ts")) {
  policyFiles = [
    path.join(policyBase, "10-xxx.md"),
    path.join(policyBase, "40-new-policy.md"),
  ];
}
```

### 新しいレイヤーの追加

```
policy/
├── web/
│   └── test-strategy/
├── server/              # ← 新レイヤー
│   └── domain-model/    # ← 新ポリシー
└── infra/
    └── terraform/

review/
├── web/
│   └── test-strategy/
├── server/              # ← 対応するMCPツール
│   └── domain-model/
│       └── index.ts
└── infra/
    └── terraform/
        └── index.ts
```

## 開発

```bash
# 開発モード（ビルド + 実行）
npm run dev

# ビルドのみ
npm run build

# 実行のみ
npm start
```

## アーキテクチャのポイント

1. **並列処理**
   - ポリシーファイルの読み込み: Promise.all
   - 複数ファイルのレビュー: Promise.all

2. **ポリシー選択の自動化**
   - ファイル拡張子からポリシーを自動選択
   - 適切なポリシーのみを読み込み

3. **Claude Agent SDK統合**
   - MCPツール内でClaude APIを直接呼び出し
   - レビュー結果を自動で集約
