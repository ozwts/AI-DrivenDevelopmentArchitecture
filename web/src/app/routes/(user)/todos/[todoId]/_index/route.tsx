import { useEffect } from "react";
import { useOutletContext, Link } from "react-router";
import { PencilIcon } from "@heroicons/react/24/outline";
import { Button, Card } from "@/app/lib/ui";
import { TodoDetail } from "../../_shared/components";
import { buildLogger } from "@/app/lib/logger";
import type { TodoOutletContext } from "../route";

const logger = buildLogger("TodoDetailRoute");

/**
 * TODO詳細ページ
 * 責務: TODOの詳細表示、添付ファイル管理
 */
export default function TodoDetailRoute() {
  const { todo, getProjectById } = useOutletContext<TodoOutletContext>();

  // ページ表示ログ
  useEffect(() => {
    logger.info("TODO詳細ページ表示", { todoId: todo.id, title: todo.title });
  }, [todo]);

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold text-text-primary">TODO詳細</h1>
        <Link to={`/todos/${todo.id}/edit`}>
          <Button variant="secondary">
            <PencilIcon className="h-4 w-4 mr-2" />
            編集
          </Button>
        </Link>
      </div>

      {/* Detail */}
      <Card>
        <Card.Body>
          <TodoDetail todo={todo} project={getProjectById(todo.projectId)} />
        </Card.Body>
      </Card>
    </>
  );
}
