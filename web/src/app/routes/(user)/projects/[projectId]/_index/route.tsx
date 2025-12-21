import { useEffect } from "react";
import { useOutletContext, Link } from "react-router";
import { PencilIcon, FolderIcon } from "@heroicons/react/24/outline";
import { Button, Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import type { ProjectOutletContext } from "../route";

const logger = buildLogger("ProjectDetailRoute");

/**
 * プロジェクト詳細ページ
 * 責務: プロジェクトの詳細表示
 */
export default function ProjectDetailRoute() {
  const { project, todoCount } = useOutletContext<ProjectOutletContext>();

  // ページ表示ログ
  useEffect(() => {
    logger.info("プロジェクト詳細ページ表示", {
      projectId: project.id,
      name: project.name,
      todoCount,
    });
  }, [project, todoCount]);

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-8">
        {/* style属性: ユーザー選択の動的カラー（Tailwindトークン化不可） */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-md flex items-center justify-center"
            style={{ backgroundColor: project.color }}
          >
            <FolderIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              {project.name}
            </h1>
            <p className="text-text-secondary">{todoCount}件のTODO</p>
          </div>
        </div>
        <Link to={`/projects/${project.id}/edit`}>
          <Button variant="secondary">
            <PencilIcon className="h-4 w-4 mr-2" />
            編集
          </Button>
        </Link>
      </div>

      {/* 詳細情報 */}
      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-2">
              説明
            </h2>
            <p className="text-text-primary">
              {project.description ?? "説明はありません"}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-text-secondary mb-2">
              プロジェクトカラー
            </h2>
            {/* style属性: ユーザー選択の動的カラー（Tailwindトークン化不可） */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-md"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-text-primary font-mono">
                {project.color}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border-light">
            <div>
              <h2 className="text-sm font-medium text-text-secondary mb-1">
                作成日
              </h2>
              <p className="text-text-primary">
                {new Date(project.createdAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-medium text-text-secondary mb-1">
                更新日
              </h2>
              <p className="text-text-primary">
                {new Date(project.updatedAt).toLocaleDateString("ja-JP")}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* TODOへのリンク */}
      <div className="mt-6">
        <Link to={`/todos?projectId=${project.id}`} className="block">
          <Button variant="primary" className="w-full">
            このプロジェクトのTODOを見る
          </Button>
        </Link>
      </div>
    </>
  );
}
