/**
 * User API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { request, requestVoid, normalizePatchRequest } from "@/app/lib/api";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

export const userApi = {
  getUsers: async (): Promise<UserResponse[]> => {
    return request("/users", schemas.UsersResponse);
  },

  searchUsers: async (name: string): Promise<UserResponse[]> => {
    const params = new URLSearchParams({ name });
    return request(`/users?${params.toString()}`, schemas.UsersResponse);
  },

  getUser: async (userId: string): Promise<UserResponse> => {
    return request(`/users/${userId}`, schemas.UserResponse);
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse);
  },

  updateCurrentUser: async (
    data: UpdateUserParams,
    dirtyFields: Partial<Record<keyof UpdateUserParams, boolean>>,
  ): Promise<UserResponse> => {
    const normalized = normalizePatchRequest(data, dirtyFields);
    return request("/users/me", schemas.UserResponse, {
      method: "PATCH",
      body: JSON.stringify(normalized),
    });
  },

  deleteCurrentUser: async (): Promise<void> => {
    return requestVoid("/users/me", {
      method: "DELETE",
    });
  },

  registerUser: async (): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse, {
      method: "POST",
    });
  },
};
