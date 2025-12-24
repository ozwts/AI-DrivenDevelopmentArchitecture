# 条件分岐バリデーション

## 概要

フォームの値に応じて動的にバリデーションルールを変更する場合は`superRefine`を使用する。

## パターン

```typescript
// app/routes/(user)/products/new/components/ProductForm.tsx
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const productFormSchema = z
  .object({
    type: z.enum(["physical", "digital"]),
    name: z.string().min(1, "商品名は必須です"),
    // 物理商品の場合のみ必須
    weight: z.number().optional(),
    // デジタル商品の場合のみ必須
    downloadUrl: z.string().url().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "physical" && !data.weight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "物理商品には重量が必須です",
        path: ["weight"],
      });
    }
    if (data.type === "digital" && !data.downloadUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "デジタル商品にはダウンロードURLが必須です",
        path: ["downloadUrl"],
      });
    }
  });

type ProductFormData = z.infer<typeof productFormSchema>;

export function ProductForm({ onSubmit }: { onSubmit: (data: ProductFormData) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
  });

  const productType = watch("type");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <select {...register("type")}>
        <option value="physical">物理商品</option>
        <option value="digital">デジタル商品</option>
      </select>

      <input {...register("name")} placeholder="商品名" />

      {productType === "physical" && (
        <input {...register("weight", { valueAsNumber: true })} placeholder="重量" />
      )}

      {productType === "digital" && (
        <input {...register("downloadUrl")} placeholder="ダウンロードURL" />
      )}

      <button type="submit">作成</button>
    </form>
  );
}
```

## ポイント

- `superRefine`で条件付きバリデーションを実装
- `watch`でフォーム値を監視し、条件によってフィールドを出し分け
- `path`でエラーを特定フィールドに紐付け

## 関連ドキュメント

- `30-form-overview.md`: フォーム設計概要
