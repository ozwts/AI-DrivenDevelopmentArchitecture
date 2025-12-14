/**
 * 外部サービスへのファイルアップロード
 * S3署名付きURLなど、API基盤を経由しない外部サービスへのアップロード用
 */
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("ExternalUpload");

/**
 * 署名付きURLへのファイルアップロード（S3等）
 *
 * @param uploadUrl - 署名付きURL
 * @param file - アップロードするファイル
 * @throws Error アップロード失敗時
 */
export const uploadToSignedUrl = async (
  uploadUrl: string,
  file: File,
): Promise<void> => {
  logger.debug("署名付きURLへのアップロード開始", {
    filename: file.name,
    size: file.size,
    type: file.type,
  });

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    logger.error("署名付きURLへのアップロード失敗", {
      filename: file.name,
      status: response.status,
      statusText: response.statusText,
    });
    throw new Error(`Upload Failed: ${response.status} ${response.statusText}`);
  }

  logger.debug("署名付きURLへのアップロード成功", { filename: file.name });
};
