import { useState } from "react";
import { useNavigate } from "react-router";
import { PlusIcon, FolderIcon } from "@heroicons/react/24/outline";
import { Button, Modal, LoadingPage, Alert, EmptyState } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/lib/hooks";
import { useTodos } from "@/app/features/todo";
import { useProjects, useDeleteProject } from "@/app/features/project";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { ProjectCard } from "./_shared";

const logger = buildLogger("ProjectsIndexRoute");

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;

/**
 * プロジェクト一覧ページ
 * 責務: プロジェクトの一覧表示と削除
 */
export default function ProjectsIndexRoute() {
  const [deletingProject, setDeletingProject] = useState<
    ProjectResponse | undefined
  >();

  const navigate = useNavigate();
  const toast = useToast();

  const { data: projects, isLoading, error } = useProjects();
  const { data: allTodos } = useTodos();
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    if (!deletingProject) return;
    logger.info("プロジェクト削除開始", { projectId: deletingProject.id, name: deletingProject.name });
    try {
      await deleteProject.mutateAsync(deletingProject.id);
      logger.info("プロジェクト削除成功", { projectId: deletingProject.id });
      setDeletingProject(undefined);
      toast.success("プロジェクトを削除しました");
    } catch (error) {
      logger.error("プロジェクト削除失敗", error instanceof Error ? error : { projectId: deletingProject.id });
      toast.error("プロジェクトの削除に失敗しました");
    }
  };

  const handleProjectClick = (project: ProjectResponse) => {
    navigate(`/todos?projectId=${project.id}`);
  };

  const handleEdit = (project: ProjectResponse) => {
    navigate(`/projects/${project.id}/edit`);
  };

  const getTodoCount = (projectId: string) => {
    if (!allTodos) return 0;
    return allTodos.filter((todo) => todo.projectId === projectId).length;
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="error" title="エラーが発生しました">
          プロジェクトの読み込みに失敗しました。
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">
              プロジェクト
            </h1>
            <p className="mt-2 text-text-secondary">
              プロジェクトごとにTODOを管理しましょう
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate("/projects/new")}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            新規プロジェクト
          </Button>
        </div>
      </div>

      {/* プロジェクトグリッド */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: ProjectResponse) => (
            <ProjectCard
              key={project.id}
              project={project}
              todoCount={getTodoCount(project.id)}
              onEdit={handleEdit}
              onDelete={setDeletingProject}
              onClick={handleProjectClick}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderIcon className="h-16 w-16 text-gray-400" />}
          title="プロジェクトがありません"
          description="新しいプロジェクトを作成して始めましょう"
          action={
            <Button
              variant="primary"
              onClick={() => navigate("/projects/new")}
              >
              <PlusIcon className="h-5 w-5 mr-2" />
              新規プロジェクト
            </Button>
          }
        />
      )}

      {/* 削除確認モーダル */}
      <Modal
        isOpen={!!deletingProject}
        onClose={() => {
          setDeletingProject(undefined);
        }}
        title="プロジェクトの削除"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setDeletingProject(undefined);
              }}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteProject.isPending}
            >
              削除
            </Button>
          </>
        }
      >
        <p className="text-text-secondary">
          プロジェクト「{deletingProject?.name}」を削除してもよろしいですか？
          <br />
          {deletingProject && (
            <>
              このプロジェクトに紐づくTODOが
              <span className="font-semibold">
                {getTodoCount(deletingProject.id)}件
              </span>
              削除されます。
              <br />
            </>
          )}
          この操作は取り消せません。
        </p>
      </Modal>
    </div>
  );
}
