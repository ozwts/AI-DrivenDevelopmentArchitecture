import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/app/lib/api";
import { schemas } from "@/generated/zod-schemas";

type UpdateUserParams = z.infer<typeof schemas.UpdateUserParams>;

const QUERY_KEY = "users";
const CURRENT_USER_QUERY_KEY = "currentUser";

/**
 * 現在のユーザー情報を取得するフック
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: [CURRENT_USER_QUERY_KEY],
    queryFn: () => apiClient.getCurrentUser(),
  });
}

/**
 * 現在のユーザー情報を更新するフック
 */
export function useUpdateCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserParams) => apiClient.updateCurrentUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CURRENT_USER_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

/**
 * 現在のユーザーを削除するフック
 */
export function useDeleteCurrentUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.deleteCurrentUser(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CURRENT_USER_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      // ユーザー削除後はログアウト処理が必要（ログインページへリダイレクト）
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/login";
    },
  });
}
