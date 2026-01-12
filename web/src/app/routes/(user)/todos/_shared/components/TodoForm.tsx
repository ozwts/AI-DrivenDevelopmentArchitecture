import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, TextField, TextareaField, SelectField } from "@/app/lib/ui";
import {
  STATUS_VALUE_LABEL_PAIRS,
  PRIORITY_VALUE_LABEL_PAIRS,
} from "@/app/features/todo";
import { schemas } from "@/generated/zod-schemas";
import { useUsers } from "@/app/features/user";
import { useProjects, useProjectMembers } from "@/app/features/project";
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
  readonly onSubmit: (
    data: UpdateTodoParams,
    dirtyFields: Partial<Record<keyof UpdateTodoParams, boolean>>,
  ) => void;
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
    formState: { errors, dirtyFields },
    reset,
    control,
    setValue,
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
      (
        onSubmit as (
          data: UpdateTodoParams,
          dirtyFields: Partial<Record<keyof UpdateTodoParams, boolean>>,
        ) => void
      )(
        data as UpdateTodoParams,
        dirtyFields as Partial<Record<keyof UpdateTodoParams, boolean>>,
      );
    } else {
      (onSubmit as (data: RegisterTodoParams, files: File[]) => void)(
        data as RegisterTodoParams,
        selectedFiles,
      );
    }
  };

  // プロジェクト選択を監視
  const selectedProjectId = useWatch({
    control,
    name: "projectId",
    defaultValue: todo?.projectId ?? "",
  });

  // 選択中のプロジェクトのメンバーを取得
  const { data: projectMembers = [] } = useProjectMembers(
    selectedProjectId ?? "",
  );

  // プロジェクト変更時に担当者をリセット
  useEffect(() => {
    if (selectedProjectId) {
      // プロジェクトが選択された場合、現在の担当者がメンバーに含まれていなければリセット
      const memberUserIds = projectMembers.map((m) => m.userId);
      const currentAssignee = todo?.assigneeUserId ?? "";
      if (currentAssignee && !memberUserIds.includes(currentAssignee)) {
        setValue("assigneeUserId", "");
      }
    }
  }, [selectedProjectId, projectMembers, setValue, todo?.assigneeUserId]);

  const projectOptions = [
    { value: "", label: "プロジェクトなし" },
    ...(projects ?? []).map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  // プロジェクト選択時はメンバーのみ、未選択時は全ユーザーを表示
  const assigneeOptions = selectedProjectId
    ? [
        { value: "", label: "担当者なし（自分が担当者になります）" },
        ...projectMembers.map((member) => ({
          value: member.userId,
          label: member.user.name,
        })),
      ]
    : [
        { value: "", label: "担当者なし（自分が担当者になります）" },
        ...(users ?? []).map((user) => ({
          value: user.id,
          label: user.name,
        })),
      ];

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <TextField
        label="タイトル"
        {...register("title")}
        error={errors.title?.message}
        placeholder="例: データベース設計を完了する"
        required
      />

      <TextareaField
        label="説明"
        {...register("description")}
        error={errors.description?.message}
        placeholder="TODOの詳細を入力してください"
        rows={4}
      />

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="ステータス"
          {...register("status")}
          options={statusOptions}
          error={errors.status?.message}
        />

        <SelectField
          label="優先度"
          {...register("priority")}
          options={priorityOptions}
          error={errors.priority?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="プロジェクト"
          {...register("projectId")}
          options={projectOptions}
          error={errors.projectId?.message}
        />

        <TextField
          type="date"
          label="期限日"
          {...register("dueDate")}
          error={errors.dueDate?.message}
        />
      </div>

      <SelectField
        label="担当者"
        {...register("assigneeUserId")}
        options={assigneeOptions}
        error={errors.assigneeUserId?.message}
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
        <Button type="button" variant="ghost" onClick={onCancel}>
          キャンセル
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {mode === "edit" ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
};
