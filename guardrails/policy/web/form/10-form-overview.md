# フォーム設計概要

## 核心原則

フォームは**Zod + React Hook Form**で実装し、OpenAPI生成スキーマとの一貫性を保つ。

**根拠となる憲法**:
- `validation-principles.md`: Single Source of Truth
- `architecture-principles.md`: 型による契約

## 実施すること

1. **Zodスキーマによるバリデーション**: `@/generated/zod-schemas`から生成されたスキーマを使用
2. **React Hook Formとの統合**: `zodResolver`でZodスキーマを接続
3. **条件分岐バリデーション**: `superRefine`で複雑な条件を表現
4. **エラー表示の統一**: フィールドごとにエラーメッセージを表示

## 実施しないこと

1. **独自バリデーションロジック** → Zodスキーマで表現
2. **手動のフォーム状態管理** → React Hook Formに委譲
3. **スキーマの重複定義** → OpenAPI生成スキーマを使用

## 基本パターン

```typescript
// app/routes/(user)/todos/new/components/TodoForm.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemas } from "@/generated/zod-schemas";
import type { z } from "zod";
import { Button, Input } from "@/app/lib/ui";

const todoFormSchema = schemas.CreateTodoRequest;
type TodoFormData = z.infer<typeof todoFormSchema>;

type Props = {
  readonly onSubmit: (data: TodoFormData) => void;
};

export function TodoForm({ onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TodoFormData>({
    resolver: zodResolver(todoFormSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register("title")} error={!!errors.title} />
      {errors.title && <span>{errors.title.message}</span>}
      <Button type="submit">作成</Button>
    </form>
  );
}
```

## 更新フォームでの注意点

更新フォーム（PATCH用）では、`dirtyFields` を使用して変更フィールドのみを送信する。

```typescript
const {
  handleSubmit,
  formState: { dirtyFields },
} = useForm<UpdateTodoParams>({
  defaultValues: todo,  // サーバーから取得した現在値を設定
});
```

**重要**: `defaultValues` にサーバーの現在値を設定しないと、全フィールドが dirty になる。

詳細は `../api/20-request-normalization.md` を参照。

## 関連ドキュメント

- `20-conditional-validation.md`: 条件分岐バリデーション
- `../api/20-request-normalization.md`: リクエスト正規化（dirtyFields、空文字列→null変換）
- `../ui/10-ui-overview.md`: UIプリミティブ設計概要
