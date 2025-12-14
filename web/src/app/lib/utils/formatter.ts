/**
 * ファイルサイズをフォーマット
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    String(Math.round((bytes / Math.pow(k, i)) * 100) / 100) + " " + sizes[i]
  );
};

/**
 * 日付を日本語形式でフォーマット
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * 日付を日本語形式でフォーマット（簡易版）
 */
export const formatDateShort = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("ja-JP");
};
