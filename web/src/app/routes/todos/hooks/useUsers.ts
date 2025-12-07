import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";

const QUERY_KEY = "users";

/**
 * ユーザー一覧を取得するフック（TODO担当者選択用）
 */
export function useUsers() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => apiClient.getUsers(),
  });
}
