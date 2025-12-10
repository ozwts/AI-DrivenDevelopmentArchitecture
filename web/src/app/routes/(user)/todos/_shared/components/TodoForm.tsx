import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Textarea, Select } from "@/app/lib/ui";
import {
  STATUS_VALUE_LABEL_PAIRS,
  PRIORITY_VALUE_LABEL_PAIRS,
} from "@/app/lib/utils";
import { schemas } from "@/generated/zod-schemas";
import { useUsers } from "@/app/features/user";
import { useProjects } from "@/app/features/project";
import { FileUploadSection } from "./FileUploadSection";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "../constants";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoResponse = z.infer<typeof schemas.TodoResponse>;

type TodoFormCreateProps = {
  readonly mode: "create";
  readonly onSubmit: (data: RegisterTodoParams, files: File[]) => void;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
};

type TodoFormEditProps = {
  readonly mode: "edit";
  readonly todo: TodoResponse;
  readonly onSubmit: (data: UpdateTodoParams) => void;
  readonly onCancel: () => void;
  readonly isLoading?: boolean;
};

type TodoFormProps = TodoFormCreateProps | TodoFormEditProps;

const statusOptions = STATUS_VALUE_LABEL_PAIRS.map(([value, label]) => ({
  value,
  label,
}));

const priorityOptions = PRIORITY_VALUE_LABEL_PAIRS.map(([value, label]) => ({
  value,
  label,
}));

export const TodoForm = (props: TodoFormProps) => {
  const { mode, onSubmit, onCancel, isLoading = false } = props;
  const todo = mode === "edit" ? props.todo : undefined;

  const { data: projects } = useProjects();
  const { data: users } = useUsers();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterTodoParams | UpdateTodoParams>({
    defaultValues: todo
      ? {
          title: todo.title,
          description: todo.description ?? "",
          status: todo.status,
          priority: todo.priority,
          dueDate: todo.dueDate
            ? new Date(todo.dueDate).toISOString().split("T")[0]
            : "",
          projectId: todo.projectId,
          assigneeUserId: todo.assigneeUserId,
        }
      : {
          title: "",
          description: "",
          status: "TODO",
          priority: "MEDIUM",
          dueDate: "",
          projectId: "",
          assigneeUserId: "",
        },
    resolver: zodResolver(
      todo ? schemas.UpdateTodoParams : schemas.RegisterTodoParams,
    ),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  useEffect(() => {
    if (todo) {
      reset({
        title: todo.title,
        description: todo.description ?? "",
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.dueDate
          ? new Date(todo.dueDate).toISOString().split("T")[0]
          : "",
        projectId: todo.projectId,
        assigneeUserId: todo.assigneeUserId,
      });
    }
  }, [todo, reset]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    // ファイルサイズとタイプのバリデーション
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}（サイズ超過）`);
      } else if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name}（非対応形式）`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      setFileError(
        `以下のファイルは追加できませんでした: ${invalidFiles.join(", ")}`,
      );
    } else {
      setFileError("");
    }

    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setFileError("");
  };

  const onFormSubmit = (data: RegisterTodoParams | UpdateTodoParams) => {
    if (mode === "edit") {
      (onSubmit as (data: UpdateTodoParams) => void)(data as UpdateTodoParams);
    } else {
      (onSubmit as (data: RegisterTodoParams, files: File[]) => void)(
        data as RegisterTodoParams,
        selectedFiles,
      );
    }
  };

  const projectOptions = [
    { value: "", label: "プロジェクトなし" },
    ...(projects ?? []).map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  const assigneeOptions = [
    { value: "", label: "担当者なし（自分が担当者になります）" },
    ...(users ?? []).map((user) => ({
      value: user.id,
      label: user.name,
    })),
  ];

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <Input
        label="タイトル"
        {...register("title")}
        error={errors.title?.message}
        placeholder="例: データベース設計を完了する"
        required
        data-testid="input-title"
      />

      <Textarea
        label="説明"
        {...register("description")}
        error={errors.description?.message}
        placeholder="TODOの詳細を入力してください"
        rows={4}
        data-testid="textarea-description"
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="ステータス"
          {...register("status")}
          options={statusOptions}
          error={errors.status?.message}
          data-testid="select-status"
        />

        <Select
          label="優先度"
          {...register("priority")}
          options={priorityOptions}
          error={errors.priority?.message}
          data-testid="select-priority"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="プロジェクト"
          {...register("projectId")}
          options={projectOptions}
          error={errors.projectId?.message}
          data-testid="select-project"
        />

        <Input
          type="date"
          label="期限日"
          {...register("dueDate")}
          error={errors.dueDate?.message}
          data-testid="input-due-date"
        />
      </div>

      <Select
        label="担当者"
        {...register("assigneeUserId")}
        options={assigneeOptions}
        error={errors.assigneeUserId?.message}
        data-testid="select-assignee"
      />

      {/* ファイル添付（新規作成時のみ） */}
      {mode === "create" && (
        <FileUploadSection
          selectedFiles={selectedFiles}
          onFileSelect={handleFileSelect}
          onFileRemove={handleRemoveFile}
          fileError={fileError}
        />
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          data-testid="cancel-button"
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          data-testid="submit-button"
        >
          {mode === "edit" ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
};
