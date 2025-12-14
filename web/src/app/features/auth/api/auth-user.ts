/**
 * 認証フロー用ユーザーAPI
 * AuthInitializerで使用される認証関連のユーザー操作
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { request } from "@/app/lib/api";

type UserResponse = z.infer<typeof schemas.UserResponse>;

export const authUserApi = {
  /**
   * 現在のユーザー情報を取得（認証済みトークンから）
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse);
  },

  /**
   * 新規ユーザーを登録（初回ログイン時）
   */
  registerUser: async (): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse, {
      method: "POST",
    });
  },
};
