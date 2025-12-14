import { useState } from "react";
import { attachmentApi } from "../api";
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("useFileUpload");

type FileUploadResult = {
  totalFiles: number;
  failedFiles: string[];
  successCount: number;
};

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (
    todoId: string,
    files: File[],
  ): Promise<FileUploadResult> => {
    if (files.length === 0) {
      return { totalFiles: 0, failedFiles: [], successCount: 0 };
    }

    logger.info("ファイルアップロード開始", {
      todoId,
      fileCount: files.length,
    });
    setIsUploading(true);
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        try {
          logger.debug("ファイル処理開始", {
            filename: file.name,
            size: file.size,
          });

          // 1. アップロード準備（uploadUrlとattachmentを取得）
          const { uploadUrl, attachment } =
            await attachmentApi.prepareAttachment(todoId, {
              filename: file.name,
              contentType: file.type,
              filesize: file.size,
            });

          // 2. S3に直接アップロード
          await attachmentApi.uploadFileToS3(uploadUrl, file);

          // 3. ステータスをUPLOADEDに更新
          await attachmentApi.updateAttachment(todoId, attachment.id, {
            status: "UPLOADED",
          });

          logger.debug("ファイル処理完了", {
            filename: file.name,
            attachmentId: attachment.id,
          });
        } catch (error) {
          logger.error("ファイルアップロードエラー", {
            filename: file.name,
            error,
          });
          failedFiles.push(file.name);
        }
      }

      const result = {
        totalFiles: files.length,
        failedFiles,
        successCount: files.length - failedFiles.length,
      };

      logger.info("ファイルアップロード完了", result);
      return result;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFiles,
    isUploading,
  };
};
