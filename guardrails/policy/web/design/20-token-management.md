# トークンの管理と再構成

## 核心原則

デザイントークンは不変ではなく、実装に応じて**継続的に再構成**する。個別のスタイル修正ではなく、トークン体系自体を見直し、一貫性のある変更を行う。

**根拠となる憲法**:
- `design-principles.md`: トークンの継続的再構成
- `analyzability-principles.md`: 解析可能性（トークンによる制約）

## トークン体系の構造

| カテゴリ | 4原則との対応 | 役割 |
|---------|--------------|------|
| Spacing | 整列・近接 | 余白の大小で関連性を表現 |
| Color | 対比 | 色の階層で重要度を表現 |
| Typography | 対比 | サイズ・ウェイトで階層を表現 |
| Component | 反復 | バリアントで一貫性を保証 |

## 再構成のトリガー

| トリガー | 兆候 | 対応 |
|---------|------|------|
| 表現力の不足 | 「この階層がない」 | トークンの追加・細分化 |
| 類似トークンの乱立 | 似た値が複数定義 | トークンの統合 |
| 一貫性の崩れ | arbitrary valuesの増加 | トークン体系の再設計 |
| ブランド変更 | カラーパレットの刷新 | トークン値の一括更新 |

## 再構成のプロセス

```
1. 課題の特定
   └─ どのトークンが不足/過剰/不適切か
   └─ arbitrary valuesの洗い出し

2. トークン体系の再設計
   └─ tailwind.config.js の修正
   └─ セマンティックな命名の見直し

3. 全体への一貫した適用
   └─ 変更したトークンを使用する全箇所を更新
   └─ コンポーネントのスタイル修正

4. Linterによる検証
   └─ 未定義トークンがないか確認
   └─ arbitrary valuesがないか確認
```

## 解析可能性によるトークン品質保証

| レベル | 検証内容 | 実装方法 |
|--------|---------|---------|
| レベル3（型） | トークン外の値を禁止 | 設定ファイルで選択肢を限定 |
| レベル2（Linter） | 未定義クラスの検出 | ESLint + Tailwind plugin |
| レベル1（ドキュメント） | 原則の適用判断 | デザインレビュー |

### Linter設定例

```javascript
// eslint.config.js
import tailwind from "eslint-plugin-tailwindcss";

export default [
  ...tailwind.configs["flat/recommended"],
  {
    rules: {
      "tailwindcss/no-custom-classname": "warn",
      "tailwindcss/no-arbitrary-value": "error",
    },
  },
];
```

## Do / Don't

### Do

```
課題: 「この色の階層が足りない」

1. トークン体系を見直す
   → text.quaternary を追加
2. 全体に一貫して適用
   → 該当箇所をすべて更新
3. Linterで検証
```

### Don't

```
課題: 「この色の階層が足りない」

❌ その場でarbitrary valueを使う
   → text-[#999999]
❌ 個別にハードコードする
   → className="text-gray-400"
```

## 関連ドキュメント

- `10-design-overview.md`: デザイン概要
- `../ui/10-ui-overview.md`: UIプリミティブ設計概要
