import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Textarea } from "../../components/Textarea";
import { Select } from "../../components/Select";
import { Alert } from "../../components/Alert";
import {
  STATUS_VALUE_LABEL_PAIRS,
  PRIORITY_VALUE_LABEL_PAIRS,
} from "../../constants/labels";
import { schemas } from "../../generated/zod-schemas";
import { useProjects } from "../../hooks/useProjects";
import { useUsers } from "../../hooks/useUsers";

type RegisterTodoParams = z.infer<typeof schemas.RegisterTodoParams>;
type UpdateTodoParams = z.infer<typeof schemas.UpdateTodoParams>;
type TodoResponse = z.infer<typeof schemas.TodoResponse>;

interface TodoFormProps {
  todo?: TodoResponse;
  onSubmit: (data: RegisterTodoParams, files: File[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface TodoFormPropsUpdate {
  todo: TodoResponse;
  onSubmit: (data: UpdateTodoParams) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
  "application/x-yaml",
];

const statusOptions = STATUS_VALUE_LABEL_PAIRS.map(([value, label]) => ({
  value,
  label,
}));

const priorityOptions = PRIORITY_VALUE_LABEL_PAIRS.map(([value, label]) => ({
  value,
  label,
}));

export const TodoForm = ({
  todo,
  onSubmit,
  onCancel,
  isLoading = false,
}: TodoFormProps | TodoFormPropsUpdate) => {
  const { data: projects } = useProjects();
  const { data: users } = useUsers();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterTodoParams | UpdateTodoParams>({
    defaultValues: todo
      ? {
          title: todo.title,
          description: todo.description || "",
          status: todo.status,
          priority: todo.priority,
          dueDate: todo.dueDate
            ? new Date(todo.dueDate).toISOString().split("T")[0]
            : "",
          projectId: todo.projectId || "",
          assigneeUserId: todo.assigneeUserId || "",
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
        description: todo.description || "",
        status: todo.status,
        priority: todo.priority,
        dueDate: todo.dueDate
          ? new Date(todo.dueDate).toISOString().split("T")[0]
          : "",
        projectId: todo.projectId || "",
        assigneeUserId: todo.assigneeUserId || "",
      });
    }
  }, [todo, reset]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const onFormSubmit = (data: RegisterTodoParams | UpdateTodoParams) => {
    if (todo) {
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
    ...(projects || []).map((project) => ({
      value: project.id,
      label: project.name,
    })),
  ];

  const assigneeOptions = [
    { value: "", label: "担当者なし（自分が担当者になります）" },
    ...(users || []).map((user) => ({
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
      />

      <Textarea
        label="説明"
        {...register("description")}
        error={errors.description?.message}
        placeholder="TODOの詳細を入力してください"
        rows={4}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="ステータス"
          {...register("status")}
          options={statusOptions}
          error={errors.status?.message}
        />

        <Select
          label="優先度"
          {...register("priority")}
          options={priorityOptions}
          error={errors.priority?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="プロジェクト"
          {...register("projectId")}
          options={projectOptions}
          error={errors.projectId?.message}
        />

        <Input
          type="date"
          label="期限日"
          {...register("dueDate")}
          error={errors.dueDate?.message}
        />
      </div>

      <Select
        label="担当者"
        {...register("assigneeUserId")}
        options={assigneeOptions}
        error={errors.assigneeUserId?.message}
      />

      {/* ファイル添付（新規作成時のみ） */}
      {!todo && (
        <div className="space-y-3 pt-2 border-t border-border-light" data-testid="file-upload-section">
          <label className="block text-sm font-medium text-text-primary">
            ファイル添付（任意）
          </label>

          {/* ファイル選択ボタン */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_FILE_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload-todo-form"
              multiple
              data-testid="file-input"
            />
            <label
              htmlFor="file-upload-todo-form"
              className="inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 px-3 py-1.5 text-sm bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-50 focus:ring-secondary-400 cursor-pointer"
              data-testid="file-select-label"
            >
              <PaperClipIcon className="h-4 w-4 mr-2" />
              ファイルを選択
            </label>
            {selectedFiles.length > 0 && (
              <span className="text-sm text-text-secondary" data-testid="file-count">
                {selectedFiles.length}個のファイルを選択中
              </span>
            )}
          </div>

          {/* エラーメッセージ */}
          {fileError && <Alert variant="error">{fileError}</Alert>}

          {/* 選択中のファイル一覧 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-2 p-3 bg-background-surface rounded-md border border-border-light"
                >
                  <PaperClipIcon className="h-4 w-4 text-text-tertiary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(index)}
                    className="!p-2 flex-shrink-0"
                    aria-label={`${file.name}を削除`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* ヘルプテキスト */}
          <p className="text-xs text-text-tertiary">
            対応形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト（最大10MB）
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} data-testid="cancel-button">
          キャンセル
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} data-testid="submit-button">
          {todo ? "更新" : "作成"}
        </Button>
      </div>
    </form>
  );
};
