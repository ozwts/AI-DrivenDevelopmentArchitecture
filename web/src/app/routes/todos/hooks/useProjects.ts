import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/app/lib/api";

const QUERY_KEY = "projects";

/**
 * プロジェクト一覧を取得するフック（TODO担当者選択用）
 */
export function useProjects() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => apiClient.getProjects(),
  });
}
