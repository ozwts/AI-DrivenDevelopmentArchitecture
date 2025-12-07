import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, FolderIcon } from "@heroicons/react/24/outline";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "../../hooks/useProjects";
import { useTodos } from "../../hooks/useTodos";
import {
  Button,
  Modal,
  LoadingPage,
  Alert,
  EmptyState,
} from "../../components";
import { ProjectForm } from "./ProjectForm";
import { ProjectCard } from "./ProjectCard";
import { useToast } from "../../contexts/ToastContext";
import { z } from "zod";
import { schemas } from "../../generated/zod-schemas";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;

export const ProjectsPage = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<
    ProjectResponse | undefined
  >();
  const [deletingProject, setDeletingProject] = useState<
    ProjectResponse | undefined
  >();

  const navigate = useNavigate();
  const toast = useToast();

  const { data: projects, isLoading, error } = useProjects();
  const { data: allTodos } = useTodos();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleCreate = async (data: CreateProjectParams) => {
    try {
      await createProject.mutateAsync(data);
      setIsCreateModalOpen(false);
      toast.success("プロジェクトを作成しました");
    } catch {
      toast.error("プロジェクトの作成に失敗しました");
    }
  };

  const handleUpdate = async (data: CreateProjectParams) => {
    if (!editingProject) return;
    try {
      await updateProject.mutateAsync({
        projectId: editingProject.id,
        data,
      });
      setEditingProject(undefined);
      toast.success("プロジェクトを更新しました");
    } catch {
      toast.error("プロジェクトの更新に失敗しました");
    }
  };

  const handleDelete = async () => {
    if (!deletingProject) return;
    try {
      await deleteProject.mutateAsync(deletingProject.id);
      setDeletingProject(undefined);
      toast.success("プロジェクトを削除しました");
    } catch {
      toast.error("プロジェクトの削除に失敗しました");
    }
  };

  const handleProjectClick = (project: ProjectResponse) => {
    // プロジェクトクリック時にTODOページへ遷移してフィルター
    navigate(`/todos?projectId=${project.id}`);
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
            onClick={() => {
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2"
            data-testid="create-project-button"
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
              onEdit={setEditingProject}
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
              onClick={() => {
                setIsCreateModalOpen(true);
              }}
              data-testid="create-project-button"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              新規プロジェクト
            </Button>
          }
        />
      )}

      {/* 作成モーダル */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
        title="新規プロジェクト"
        size="lg"
      >
        <ProjectForm
          onSubmit={handleCreate}
          onCancel={() => {
            setIsCreateModalOpen(false);
          }}
          isLoading={createProject.isPending}
        />
      </Modal>

      {/* 編集モーダル */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => {
          setEditingProject(undefined);
        }}
        title="プロジェクト編集"
        size="lg"
      >
        <ProjectForm
          project={editingProject}
          onSubmit={handleUpdate}
          onCancel={() => {
            setEditingProject(undefined);
          }}
          isLoading={updateProject.isPending}
        />
      </Modal>

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
};
