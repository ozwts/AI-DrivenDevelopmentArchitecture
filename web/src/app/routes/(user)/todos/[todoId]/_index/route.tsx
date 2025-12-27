import { useEffect } from "react";
import { useOutletContext, Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { PencilIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { Button, Card } from "@/app/lib/ui";
import { useToast } from "@/app/lib/contexts";
import { TodoDetail } from "../../_shared/components";
import { useFileUpload } from "../../_shared/hooks";
import { attachmentApi } from "../../_shared/api";
import { buildLogger } from "@/app/lib/logger";
import type { TodoOutletContext } from "../route";

type AttachmentResponse = z.infer<typeof schemas.AttachmentResponse>;

const logger = buildLogger("TodoDetailRoute");

/**
 * TODO詳細ページ
 * 責務: TODOの詳細表示、添付ファイル管理
 */
export default function TodoDetailRoute() {
  const { todo, getProjectById } = useOutletContext<TodoOutletContext>();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { uploadFiles, isUploading } = useFileUpload();

  // ページ表示ログ
  useEffect(() => {
    logger.info("TODO詳細ページ表示", { todoId: todo.id, title: todo.title });
  }, [todo]);

  const handleUpload = async (file: File) => {
    logger.info("ファイルアップロード開始", { filename: file.name });
    const result = await uploadFiles(todo.id, [file]);

    if (result.failedFiles.length === 0) {
      toast.success("ファイルをアップロードしました");
    } else {
      toast.error("ファイルのアップロードに失敗しました");
    }

    // キャッシュを無効化
    queryClient.invalidateQueries({ queryKey: ["todos", todo.id] });
  };

  const handleDownload = async (attachment: AttachmentResponse) => {
    logger.info("ファイルダウンロード開始", { attachmentId: attachment.id });
    try {
      const { downloadUrl } = await attachmentApi.getDownloadUrl(
        todo.id,
        attachment.id,
      );
      // 新しいウィンドウでダウンロード（S3署名付きURLはクロスオリジンのためwindow.openを使用）
      window.open(downloadUrl, "_blank");
    } catch (error) {
      logger.error("ダウンロードURLの取得に失敗", { error });
      toast.error("ダウンロードに失敗しました");
    }
  };

  const handleDelete = async (attachment: AttachmentResponse) => {
    if (!window.confirm(`${attachment.filename}を削除してもよろしいですか？`)) {
      return;
    }

    logger.info("ファイル削除開始", { attachmentId: attachment.id });
    try {
      await attachmentApi.deleteAttachment(todo.id, attachment.id);
      toast.success("ファイルを削除しました");
      // キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ["todos", todo.id] });
    } catch (error) {
      logger.error("ファイル削除に失敗", { error });
      toast.error("ファイルの削除に失敗しました");
    }
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-text-primary">TODO詳細</h1>
        <Link to={`/todos/${todo.id}/edit`}>
          <Button variant="secondary">
            <PencilIcon className="h-4 w-4 mr-2" />
            編集
          </Button>
        </Link>
      </div>

      {/* Detail */}
      <Card>
        <Card.Body>
          <TodoDetail
            todo={todo}
            project={getProjectById(todo.projectId)}
            onUpload={handleUpload}
            onDownload={handleDownload}
            onDelete={handleDelete}
            isUploading={isUploading}
          />
        </Card.Body>
      </Card>
    </>
  );
}
