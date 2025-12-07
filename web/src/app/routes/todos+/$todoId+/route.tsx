import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";
import { Button, Card, LoadingPage, Alert } from "@/app/lib/ui";
import { useTodo } from "@/app/features/todo";
import { useProjects } from "@/app/features/project";
import { TodoDetail } from "../_shared/components";

/**
 * TODO詳細ページ
 * 責務: TODOの詳細表示、添付ファイル管理
 */
export default function TodoDetailRoute() {
  const { todoId } = useParams();
  const navigate = useNavigate();

  const { data: todo, isLoading, error } = useTodo(todoId!);
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/todos")}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <Link to={`/todos/${todoId}/edit`}>
            <Button variant="secondary">
              <PencilIcon className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-text-primary">TODO詳細</h1>
      </div>

      {/* Detail */}
      <Card>
        <TodoDetail
          todo={todo}
          project={getProjectById(todo.projectId)}
        />
      </Card>
    </div>
  );
}
