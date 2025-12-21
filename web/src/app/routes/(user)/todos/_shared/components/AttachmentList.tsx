import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { z } from "zod";
import { Button, LoadingSpinner, EmptyState } from "@/app/lib/ui";
import { schemas } from "@/generated/zod-schemas";
import { formatFileSize, formatDate } from "@/app/lib/utils/formatter";

type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

type AttachmentListProps = {
  readonly attachments?: AttachmentResponse[];
  readonly isLoading?: boolean;
  readonly onDownload: (attachment: AttachmentResponse) => void;
  readonly onDelete: (attachment: AttachmentResponse) => void;
};

export const AttachmentList = ({
  attachments,
  isLoading,
  onDownload,
  onDelete,
}: AttachmentListProps) => {
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
        icon={<PaperClipIcon className="h-16 w-16 text-neutral-400" />}
        title="添付ファイルなし"
        description="このTODOにはまだファイルが添付されていません"
      />
    );
  }

  return (
    <div className="space-y-2" data-testid="attachment-list">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between p-3 bg-background-surface rounded-md border border-border-light hover:border-border-medium transition-colors"
          data-testid={`attachment-item-${attachment.id}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <PaperClipIcon className="h-5 w-5 text-text-tertiary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {attachment.filename}
              </p>
              <p className="text-xs text-text-tertiary">
                {formatFileSize(attachment.filesize)} •{" "}
                {formatDate(attachment.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="iconOnly"
              onClick={() => {
                onDownload(attachment);
              }}
              aria-label={`${attachment.filename}をダウンロード`}
            >
              <ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="iconOnly"
              onClick={() => {
                onDelete(attachment);
              }}
              aria-label={`${attachment.filename}を削除`}
            >
              <TrashIcon className="h-4 w-4 text-error-600" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
