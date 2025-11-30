import { faker } from "@faker-js/faker";
import { TodoStatus } from "./todo-status.vo";

export type TodoStatusDummyProps = Partial<{
  status: "TODO" | "IN_PROGRESS" | "COMPLETED";
}>;

/**
 * テスト用TodoStatusファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns TodoStatusインスタンス
 */
export const todoStatusDummyFrom = (props?: TodoStatusDummyProps): TodoStatus => {
  const statusValue =
    props?.status ??
    faker.helpers.arrayElement(["TODO", "IN_PROGRESS", "COMPLETED"] as const);

  const result = TodoStatus.from({ status: statusValue });

  if (!result.success) {
    throw new Error(`Failed to generate TodoStatus: ${result.error!.message}`);
  }

  return result.data!;
};
