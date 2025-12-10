import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { Button, Input, Textarea } from "@/app/lib/ui";
import { generateColorPalette } from "@/app/lib/utils";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;

type ProjectFormProps = {
  readonly project?: ProjectResponse;
  readonly onSubmit: (data: CreateProjectParams) => Promise<void>;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
};

export const ProjectForm = ({
  project,
  onSubmit,
  onCancel,
  isLoading,
}: ProjectFormProps) => {
  const [colorPalette, setColorPalette] = useState<string[]>(() =>
    generateColorPalette(6),
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CreateProjectParams>({
    resolver: zodResolver(schemas.CreateProjectParams),
    defaultValues: project
      ? {
          name: project.name,
          description: project.description,
          color: project.color,
        }
      : {
          name: "",
          description: "",
          color: colorPalette[0],
        },
  });

  const selectedColor = watch("color");

  const handleRegenerateColors = () => {
    const newPalette = generateColorPalette(6);
    setColorPalette(newPalette);
    setValue("color", newPalette[0], { shouldDirty: true, shouldTouch: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* プロジェクト名 */}
      <Input
        label="プロジェクト名"
        {...register("name")}
        error={errors.name?.message}
        placeholder="システム刷新プロジェクト"
        data-testid="input-name"
      />

      {/* 説明 */}
      <Textarea
        label="説明"
        {...register("description")}
        error={errors.description?.message}
        placeholder="プロジェクトの詳細を入力してください"
        rows={3}
        data-testid="textarea-description"
      />

      {/* カラー選択 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-text-primary">
            プロジェクトカラー
          </label>
          <button
            type="button"
            onClick={handleRegenerateColors}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors rounded-md hover:bg-background-surface group"
            data-testid="regenerate-colors-button"
            aria-label="ランダムなカラーを生成"
          >
            <ArrowPathIcon className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
            <span>ランダム生成</span>
          </button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {colorPalette.map((color, index) => (
            <button
              key={`${color}-${index}`}
              type="button"
              onClick={() => {
                setValue("color", color);
              }}
              className={`
                h-12 rounded-md border-2 transition-all
                ${
                  selectedColor === color
                    ? "border-text-primary scale-110"
                    : "border-border-light hover:border-text-secondary"
                }
              `}
              style={{ backgroundColor: color }}
              data-testid={`color-option-${index}`}
              aria-label={`カラー ${color} を選択`}
            />
          ))}
        </div>
        <input type="hidden" {...register("color")} />
        {errors.color && (
          <p className="text-sm text-error">{errors.color.message}</p>
        )}
      </div>

      {/* フォームフッター */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          variant="ghost"
          onClick={onCancel}
          type="button"
          data-testid="cancel-button"
        >
          キャンセル
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={isLoading}
          data-testid="submit-button"
        >
          {project ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
};
