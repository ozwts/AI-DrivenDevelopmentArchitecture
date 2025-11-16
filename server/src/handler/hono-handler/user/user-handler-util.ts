import type { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import type { User } from "@/domain/model/user/user";

type UserResponse = z.infer<typeof schemas.UserResponse>;

/**
 * UserエンティティをUserResponseに変換する
 *
 * @param user Userエンティティ
 * @returns UserResponse
 */
export const convertToUserResponse = (user: User): UserResponse => ({
  id: user.id,
  sub: user.sub,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
