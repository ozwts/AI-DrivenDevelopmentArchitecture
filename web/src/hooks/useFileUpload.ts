import { useState } from "react";
import { apiClient } from "../api/client";

interface FileUploadResult {
  totalFiles: number;
  failedFiles: string[];
  successCount: number;
}

export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFiles = async (
    todoId: string,
    files: File[],
  ): Promise<FileUploadResult> => {
    if (files.length === 0) {
      return { totalFiles: 0, failedFiles: [], successCount: 0 };
    }

    setIsUploading(true);
    const failedFiles: string[] = [];

    try {
      for (const file of files) {
        try {
          // 1. アップロード準備（uploadUrlとattachmentを取得）
          const { uploadUrl, attachment } = await apiClient.prepareAttachment(
            todoId,
            {
              filename: file.name,
              contentType: file.type,
              filesize: file.size,
            },
          );

          // 2. S3に直接アップロード
          await apiClient.uploadFileToS3(uploadUrl, file);

          // 3. ステータスをUPLOADEDに更新
          await apiClient.updateAttachment(todoId, attachment.id, {
            status: "UPLOADED",
          });
        } catch (error) {
          console.error(`ファイルアップロードエラー (${file.name}):`, error);
          failedFiles.push(file.name);
        }
      }

      return {
        totalFiles: files.length,
        failedFiles,
        successCount: files.length - failedFiles.length,
      };
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFiles,
    isUploading,
  };
};
