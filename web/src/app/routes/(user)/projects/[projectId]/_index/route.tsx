import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router";
import {
  PencilIcon,
  FolderIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { Button, Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useProjectMembers } from "@/app/features/project/hooks";
import { MemberList, LeaveProjectConfirmDialog } from "../../_shared/components";
import type { ProjectOutletContext } from "../route";

const logger = buildLogger("ProjectDetailRoute");

/**
 * プロジェクト詳細ページ
 * 責務: プロジェクトの詳細表示
 */
export default function ProjectDetailRoute() {
  const { project, todoCount } = useOutletContext<ProjectOutletContext>();
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  const { data: members = [] } = useProjectMembers(project.id);

  // 最後のオーナーかどうかを判定
  const ownerCount = members.filter((m) => m.role === "OWNER").length;
  const isOwner = project.myRole === "OWNER";
  const isLastOwner = isOwner && ownerCount <= 1;

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
        <div className="flex items-center gap-2">
          <Link to={`/projects/${project.id}/edit`}>
            <Button variant="secondary">
              <PencilIcon className="h-4 w-4 mr-2" />
              編集
            </Button>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              setIsLeaveDialogOpen(true);
            }}
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-2" />
            脱退
          </Button>
        </div>
      </div>

      {/* 詳細情報 */}
      <Card>
        <Card.Body>
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
        </Card.Body>
      </Card>

      {/* メンバー一覧 */}
      <div className="mt-6">
        <MemberList projectId={project.id} myRole={project.myRole} />
      </div>

      {/* TODOへのリンク */}
      <div className="mt-6">
        <Link to={`/todos?projectId=${project.id}`} className="block">
          <Button variant="primary" fullWidth>
            このプロジェクトのTODOを見る
          </Button>
        </Link>
      </div>

      {/* 脱退確認ダイアログ */}
      <LeaveProjectConfirmDialog
        isOpen={isLeaveDialogOpen}
        onClose={() => {
          setIsLeaveDialogOpen(false);
        }}
        projectId={project.id}
        projectName={project.name}
        isLastOwner={isLastOwner}
      />
    </>
  );
}
