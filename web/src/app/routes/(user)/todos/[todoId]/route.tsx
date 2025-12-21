import { Outlet, useParams, useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, LoadingPage, Alert } from "@/app/lib/ui";
import { useTodo } from "@/app/features/todo";
import { useProjects } from "@/app/features/project";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";

type TodoResponse = z.infer<typeof schemas.TodoResponse>;
type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

/**
 * TODO詳細親ルート
 * 責務: 共通データ取得（TODO + プロジェクト一覧）、共通レイアウト、子ルートへの委譲
 */

export type TodoOutletContext = {
  todo: TodoResponse;
  projects: ProjectResponse[];
  getProjectById: (projectId?: string) => ProjectResponse | undefined;
};

export default function TodoDetailLayout() {
  const { todoId } = useParams();
  const navigate = useNavigate();

  const { data: todo, isLoading, error } = useTodo(todoId ?? "");
  const { data: projects } = useProjects();

  const getProjectById = (projectId?: string) => {
    if (!projectId || !projects) return undefined;
    return projects.find((p) => p.id === projectId);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !todo) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="エラーが発生しました">
          TODOの読み込みに失敗しました。
        </Alert>
        <Button
          variant="ghost"
          onClick={() => navigate("/todos")}
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
        <Button variant="ghost" onClick={() => navigate("/todos")} className="mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
      </div>

      {/* 子ルート */}
      <Outlet
        context={
          {
            todo,
            projects: projects ?? [],
            getProjectById,
          } satisfies TodoOutletContext
        }
      />
    </div>
  );
}
