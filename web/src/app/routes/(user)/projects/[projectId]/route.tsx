import { Outlet, useParams, useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, LoadingPage, Alert } from "@/app/lib/ui";
import { ApiError } from "@/app/lib/api";
import { useProject } from "@/app/features/project";
import { useTodos } from "@/app/features/todo";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

/**
 * プロジェクト詳細親ルート
 * 責務: 共通データ取得（プロジェクト + TODO数）、共通レイアウト、子ルートへの委譲
 */

export type ProjectOutletContext = {
  project: ProjectResponse;
  todoCount: number;
};

export default function ProjectDetailLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project, isLoading, error } = useProject(projectId ?? "");
  const { data: allTodos } = useTodos();

  const todoCount =
    allTodos?.filter((todo) => todo.projectId === projectId).length ?? 0;

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !project) {
    // エラーの種類に応じてメッセージを変更
    let errorTitle = "エラーが発生しました";
    let errorMessage = "プロジェクトの読み込みに失敗しました。";

    if (error instanceof ApiError) {
      if (error.isForbidden()) {
        errorTitle = "アクセス権限がありません";
        errorMessage =
          "このプロジェクトにアクセスする権限がありません。プロジェクトのメンバーに招待されている必要があります。";
      } else if (error.isNotFound()) {
        errorTitle = "プロジェクトが見つかりません";
        errorMessage =
          "指定されたプロジェクトは存在しないか、削除された可能性があります。";
      }
    }

    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title={errorTitle}>
          {errorMessage}
        </Alert>
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mt-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 共通ヘッダー: 戻るボタン */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          プロジェクト一覧に戻る
        </Button>
      </div>

      {/* 子ルート */}
      <Outlet
        context={
          {
            project,
            todoCount,
          } satisfies ProjectOutletContext
        }
      />
    </div>
  );
}
