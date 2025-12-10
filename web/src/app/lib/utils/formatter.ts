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

/**
 * 期限超過かどうかを判定
 */
export const isOverdue = (dueDate: string, now: Date = new Date()): boolean => {
  return new Date(dueDate) < now;
};

/**
 * 期限までの残り日数を計算
 */
export const getDaysUntilDue = (
  dueDate: string,
  now: Date = new Date(),
): number => {
  const dueDateObj = new Date(dueDate);
  return Math.ceil(
    (dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
};

/**
 * 期限の表示テキストを取得
 */
export const getDueDateLabel = (
  dueDate: string,
  now: Date = new Date(),
): string => {
  const overdue = isOverdue(dueDate, now);
  if (overdue) return "期限超過";

  const days = getDaysUntilDue(dueDate, now);
  if (days === 0) return "今日が期限";
  return `残り${days}日`;
};
