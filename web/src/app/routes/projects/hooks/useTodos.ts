import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";

const QUERY_KEY = "todos";

/**
 * TODO一覧を取得するフック（プロジェクトのTODO数表示用）
 */
export function useTodos() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => apiClient.getTodos(),
  });
}
