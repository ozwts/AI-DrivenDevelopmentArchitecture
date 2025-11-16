import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Button } from "../../components/Button";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import {
  useAttachments,
  useDeleteAttachment,
} from "../../hooks/useAttachments";
import { apiClient } from "../../api/client";
import { schemas } from "../../generated/zod-schemas";
import { useToast } from "../../contexts/ToastContext";

type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

interface AttachmentListProps {
  todoId: string;
}

export const AttachmentList = ({ todoId }: AttachmentListProps) => {
  const { data: attachments, isLoading } = useAttachments(todoId);
  const deleteAttachment = useDeleteAttachment();
  const toast = useToast();

  const handleDownload = async (attachment: AttachmentResponse) => {
    try {
      // ダウンロードURLを取得
      const { downloadUrl } = await apiClient.getDownloadUrl(
        todoId,
        attachment.id,
      );

      // 新しいタブでダウンロード
      window.open(downloadUrl, "_blank");
      toast?.showToast("success", "ダウンロードを開始しました");
    } catch (err) {
      console.error("ダウンロードエラー:", err);
      toast?.showToast("error", "ダウンロードに失敗しました");
    }
  };

  const handleDelete = async (attachment: AttachmentResponse) => {
    if (
      !window.confirm(
        `ファイル「${attachment.filename}」を削除してもよろしいですか？`,
      )
    ) {
      return;
    }

    try {
      await deleteAttachment.mutateAsync({
        todoId,
        attachmentId: attachment.id,
      });
      toast?.showToast("success", "ファイルを削除しました");
    } catch (err) {
      console.error("削除エラー:", err);
      toast?.showToast("error", "ファイルの削除に失敗しました");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return (
      <EmptyState
        icon={<PaperClipIcon className="h-16 w-16 text-gray-400" />}
        title="添付ファイルなし"
        description="このTODOにはまだファイルが添付されていません"
      />
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 bg-background-surface rounded-md border border-border-light hover:border-border-medium transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <PaperClipIcon className="h-5 w-5 text-text-tertiary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {attachment.filename}
              </p>
              <p className="text-xs text-text-tertiary">
                {formatFileSize(attachment.size)} •{" "}
                {formatDate(attachment.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(attachment)}
              className="!p-2"
              title="ダウンロード"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(attachment)}
              disabled={deleteAttachment.isPending}
              className="!p-2 text-red-600 hover:text-red-700"
              title="削除"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
