import { PencilIcon, TrashIcon, FolderIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { Card, Button } from "@/app/lib/ui";
import { schemas } from "@/generated/zod-schemas";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

type ProjectCardProps = {
  readonly project: ProjectResponse;
  readonly todoCount?: number;
  readonly onEdit: (project: ProjectResponse) => void;
  readonly onDelete: (project: ProjectResponse) => void;
  readonly onClick: (project: ProjectResponse) => void;
};

export const ProjectCard = ({
  project,
  todoCount = 0,
  onEdit,
  onDelete,
  onClick,
}: ProjectCardProps) => {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer p-6"
      onClick={() => {
        onClick(project);
      }}
    >
      <div className="space-y-4">
        {/* ヘッダー: プロジェクト色とタイトル */}
        {/* style属性: ユーザー選択の動的カラー（Tailwindトークン化不可） */}
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-md flex items-center justify-center"
            style={{ backgroundColor: project.color }}
          >
            <FolderIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-text-primary truncate">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* TODO数 */}
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <FolderIcon className="h-4 w-4" />
          <span data-testid="todo-count">{todoCount}件のTODO</span>
        </div>

        {/* フッター: アクションボタン */}
        <div className="flex items-center justify-between pt-3 border-t border-border-light">
          <div className="text-xs text-text-tertiary" data-testid="created-at">
            作成: {new Date(project.createdAt).toLocaleDateString("ja-JP")}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              className="!p-2"
              aria-label="編集"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project);
              }}
              className="!p-2 text-error-600 hover:text-error-700"
              aria-label="削除"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
