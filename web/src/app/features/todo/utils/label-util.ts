import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";

type TodoStatus = z.infer<typeof schemas.TodoStatus>;
type TodoPriority = z.infer<typeof schemas.TodoPriority>;

export const STATUS_VALUE_LABEL_PAIRS: [value: TodoStatus, label: string][] = [
  ["TODO", "未着手"],
  ["IN_PROGRESS", "進行中"],
  ["COMPLETED", "完了"],
];

export const PRIORITY_VALUE_LABEL_PAIRS: [
  value: TodoPriority,
  label: string,
][] = [
  ["LOW", "低"],
  ["MEDIUM", "中"],
  ["HIGH", "高"],
];

/**
 * ステータスラベルを取得
 */
export const getStatusLabel = (status: TodoStatus): string => {
  const pair = STATUS_VALUE_LABEL_PAIRS.find(([value]) => value === status);
  return pair ? pair[1] : status;
};

/**
 * 優先度ラベルを取得
 */
export const getPriorityLabel = (priority: TodoPriority): string => {
  const pair = PRIORITY_VALUE_LABEL_PAIRS.find(([value]) => value === priority);
  return pair ? pair[1] : priority;
};

type BadgeVariant = "default" | "success" | "warning" | "info" | "danger";

/**
 * ステータスに対応するBadge variantを取得
 */
export const getStatusBadgeVariant = (status: TodoStatus): BadgeVariant => {
  switch (status) {
    case "IN_PROGRESS":
      return "info";
    case "COMPLETED":
      return "success";
    default:
      return "default";
  }
};

/**
 * 優先度に対応するBadge variantを取得
 */
export const getPriorityBadgeVariant = (
  priority: TodoPriority,
): BadgeVariant => {
  switch (priority) {
    case "HIGH":
      return "danger";
    case "MEDIUM":
      return "warning";
    default:
      return "default";
  }
};
