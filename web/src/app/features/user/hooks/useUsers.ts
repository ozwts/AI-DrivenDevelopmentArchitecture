import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { userApi } from "../api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

const logger = buildLogger("useUsers");
const QUERY_KEY = "users";
const CURRENT_USER_QUERY_KEY = "currentUser";

/**
 * ユーザー一覧を取得するフック（TODO担当者選択用）
 */
export function useUsers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => userApi.getUsers(),
  });
}

/**
 * 現在のユーザー情報を取得するフック
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: [CURRENT_USER_QUERY_KEY],
    queryFn: () => userApi.getCurrentUser(),
  });
}

/**
 * 現在のユーザー情報を更新するフック
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserParams) => {
      logger.info("ユーザー情報更新開始", { displayName: data.displayName });
      return userApi.updateCurrentUser(data);
    },
    onSuccess: () => {
      logger.info("ユーザー情報更新成功");
      queryClient.invalidateQueries({ queryKey: [CURRENT_USER_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      logger.error("ユーザー情報更新失敗", error);
    },
  });
}

/**
 * 現在のユーザーを削除するフック
 * 注意: 削除成功後のリダイレクトはコンポーネント側で処理すること
 */
export function useDeleteCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      logger.info("アカウント削除開始");
      return userApi.deleteCurrentUser();
    },
    onSuccess: () => {
      logger.info("アカウント削除成功");
      queryClient.invalidateQueries({ queryKey: [CURRENT_USER_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      logger.error("アカウント削除失敗", error);
    },
  });
}
