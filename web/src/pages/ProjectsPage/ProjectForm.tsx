import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";
import { Button, Input, Textarea } from "../../components";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;

interface ProjectFormProps {
  project?: ProjectResponse;
  onSubmit: (data: CreateProjectParams) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * ランダムなHEXカラーを生成
 */
const getRandomColor = (): string => {
  const randomHex = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");
  return `#${randomHex}`;
};

/**
 * 複数のランダムカラーを生成
 */
const generateColorPalette = (count: number): string[] => {
  return Array.from({ length: count }, () => getRandomColor());
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
          color: colorPalette[0], // パレットの最初の色で初期化
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
      />

      {/* 説明 */}
      <Textarea
        label="説明"
        {...register("description")}
        error={errors.description?.message}
        placeholder="プロジェクトの詳細を入力してください"
        rows={3}
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
              onClick={() => setValue("color", color)}
              className={`
                h-12 rounded-md border-2 transition-all
                ${
                  selectedColor === color
                    ? "border-text-primary scale-110"
                    : "border-border-light hover:border-text-secondary"
                }
              `}
              style={{ backgroundColor: color }}
              aria-label={color}
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
        <Button variant="ghost" onClick={onCancel} type="button">
          キャンセル
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          {project ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
};
