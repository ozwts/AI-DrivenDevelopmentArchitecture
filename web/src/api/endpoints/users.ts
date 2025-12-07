/**
 * User API エンドポイント
 */
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";
import { type RequestFn, type RequestVoidFn } from "../api-client";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

export const createUserEndpoints = (
  request: RequestFn,
  requestVoid: RequestVoidFn,
) => ({
  getUsers: async (): Promise<UserResponse[]> => {
    return request("/users", schemas.UsersResponse);
  },

  getUser: async (userId: string): Promise<UserResponse> => {
    return request(`/users/${userId}`, schemas.UserResponse);
  },

  getCurrentUser: async (): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse);
  },

  updateCurrentUser: async (data: UpdateUserParams): Promise<UserResponse> => {
    return request("/users/me", schemas.UserResponse, {
      method: "PUT",
      body: JSON.stringify(data),
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
});
