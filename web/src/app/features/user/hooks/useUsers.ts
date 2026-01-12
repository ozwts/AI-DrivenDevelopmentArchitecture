import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { userApi } from "../api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

const logger = buildLogger("useUsers");
const QUERY_KEY = "users";
const CURRENT_USER_QUERY_KEY = "currentUser";
const SEARCH_USERS_QUERY_KEY = "searchUsers";

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
    mutationFn: ({
      data,
      dirtyFields,
    }: {
      data: UpdateUserParams;
      dirtyFields: Partial<Record<keyof UpdateUserParams, boolean>>;
    }) => {
      logger.info("ユーザー情報更新開始", { name: data.name });
      return userApi.updateCurrentUser(data, dirtyFields);
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

/**
 * ユーザーを検索するフック（プロジェクトメンバー招待用）
 * @param query 検索クエリ（名前またはメールアドレス）
 * @param options enabled - クエリを有効にするかどうか
 */
export function useSearchUsers(
  query: string,
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: [SEARCH_USERS_QUERY_KEY, query],
    queryFn: () => userApi.searchUsers(query),
    enabled: enabled && query.length > 0,
    staleTime: 30 * 1000, // 30秒間キャッシュを新鮮とみなす
  });
}
