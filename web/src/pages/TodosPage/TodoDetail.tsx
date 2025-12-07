import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";
import { AttachmentUpload } from "./AttachmentUpload";
import { AttachmentList } from "./AttachmentList";
import { getStatusLabel, getPriorityLabel } from "../../utils/label-util";
import { formatDateShort } from "../../utils/formatter";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

type TodoDetailProps = {
  todo: TodoResponse;
  project?: ProjectResponse;
  attachments?: AttachmentResponse[];
  isLoadingAttachments?: boolean;
  onDownload?: (attachment: AttachmentResponse) => void;
  onDelete?: (attachment: AttachmentResponse) => void;
  onUpload?: (file: File) => void;
  isUploading?: boolean;
};

export const TodoDetail = ({
  todo,
  project,
  attachments,
  isLoadingAttachments = false,
  onDownload = () => {
    // デフォルトは何もしない
  },
  onDelete = () => {
    // デフォルトは何もしない
  },
  onUpload = () => {
    // デフォルトは何もしない
  },
  isUploading = false,
}: TodoDetailProps) => {
  // PropsでattachmentsFormが渡されていない場合は、todo.attachmentsを使用
  const displayAttachments = attachments ?? todo.attachments;
  return (
    <div className="space-y-6">
      {/* TODO基本情報 */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary">{todo.title}</h3>
          {todo.description && (
            <p className="text-text-secondary mt-2">{todo.description}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-text-tertiary">ステータス:</span>
            <p className="text-text-primary font-medium">
              {getStatusLabel(todo.status)}
            </p>
          </div>
          <div>
            <span className="text-sm text-text-tertiary">優先度:</span>
            <p className="text-text-primary font-medium">
              {getPriorityLabel(todo.priority)}
            </p>
          </div>
          {todo.dueDate && (
            <div>
              <span className="text-sm text-text-tertiary">期限:</span>
              <p className="text-text-primary font-medium">
                {formatDateShort(todo.dueDate)}
              </p>
            </div>
          )}
          {todo.projectId && project && (
            <div>
              <span className="text-sm text-text-tertiary">プロジェクト:</span>
              <p className="text-text-primary font-medium">{project.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* 添付ファイルセクション */}
      <div
        className="border-t border-border-light pt-6"
        data-testid="attachment-section"
      >
        <h4 className="text-md font-semibold text-text-primary mb-4">
          添付ファイル
        </h4>

        <div className="space-y-4">
          <AttachmentUpload onUpload={onUpload} isUploading={isUploading} />
          <AttachmentList
            attachments={displayAttachments}
            isLoading={isLoadingAttachments}
            onDownload={onDownload}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};
