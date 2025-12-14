import { useParams, useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { Button, Card, LoadingPage, Alert } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/lib/hooks";
import { useProject, useUpdateProject } from "@/app/features/project";
import { ProjectForm } from "../../_shared";

const logger = buildLogger("EditProjectRoute");

type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;

/**
 * プロジェクト編集ページ
 * 責務: 既存プロジェクトの編集
 */
export default function EditProjectRoute() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: project, isLoading, error } = useProject(projectId ?? "");
  const updateProject = useUpdateProject();

  const handleSubmit = async (data: CreateProjectParams) => {
    logger.info("プロジェクト更新開始", { projectId, name: data.name });
    try {
      await updateProject.mutateAsync({
        projectId: projectId ?? "",
        data,
      });
      logger.info("プロジェクト更新成功", { projectId });
      toast.success("プロジェクトを更新しました");
      navigate(`/projects/${projectId}`);
    } catch (error) {
      logger.error("プロジェクト更新失敗", error instanceof Error ? error : { projectId });
      toast.error("プロジェクトの更新に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${projectId}`);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error || !project) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert variant="error" title="エラーが発生しました">
          プロジェクトの読み込みに失敗しました。
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          プロジェクト詳細に戻る
        </Button>
        <h1 className="text-3xl font-bold text-text-primary">
          プロジェクト編集
        </h1>
        <p className="mt-2 text-text-secondary">
          「{project.name}」を編集します
        </p>
      </div>

      {/* フォーム */}
      <Card>
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={updateProject.isPending}
        />
      </Card>
    </div>
  );
}
