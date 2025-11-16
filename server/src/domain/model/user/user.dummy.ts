import { faker } from "@faker-js/faker";
import { User } from "./user";
import {
  getDummyId,
  getDummyShortText,
  getDummyRecentDate,
  getDummyEmail,
} from "@/util/testing-util/dummy-data";

export type UserDummyProps = Partial<{
  id: string;
  sub: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のUserダミーデータを生成する
 *
 * @param props - 上書きするプロパティ（オプション）
 * @returns Userインスタンス
 *
 * @example
 * ```typescript
 * // すべてランダム値で生成
 * const user = userDummyFrom();
 *
 * // 特定フィールドのみ指定
 * const user = userDummyFrom({
 *   id: "user-123",
 *   email: "test@example.com"
 * });
 * ```
 */
export const userDummyFrom = (props?: UserDummyProps): User => {
  const now = getDummyRecentDate();
  return new User({
    id: props?.id ?? getDummyId(),
    sub: props?.sub ?? getDummyId(),
    name: props?.name ?? getDummyShortText(),
    email: props?.email ?? getDummyEmail(),
    emailVerified: props?.emailVerified ?? faker.datatype.boolean(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
