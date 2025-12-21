import { useOutletContext, useNavigate } from "react-router";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/lib/contexts";
import { useUpdateProject } from "@/app/features/project";
import { ProjectForm } from "../../_shared";
import type { ProjectOutletContext } from "../route";

const logger = buildLogger("EditProjectRoute");

type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;

/**
 * プロジェクト編集ページ
 * 責務: 既存プロジェクトの編集フォームと更新処理
 */
export default function EditProjectRoute() {
  const { project } = useOutletContext<ProjectOutletContext>();
  const navigate = useNavigate();
  const toast = useToast();

  const updateProject = useUpdateProject();

  const handleSubmit = async (
    data: UpdateProjectParams,
    dirtyFields: Partial<Record<keyof UpdateProjectParams, boolean>>,
  ) => {
    logger.info("プロジェクト更新開始", { projectId: project.id, name: data.name });
    try {
      await updateProject.mutateAsync({
        projectId: project.id,
        data,
        dirtyFields,
      });
      logger.info("プロジェクト更新成功", { projectId: project.id });
      toast.success("プロジェクトを更新しました");
      navigate(`/projects/${project.id}`);
    } catch (error) {
      logger.error(
        "プロジェクト更新失敗",
        error instanceof Error ? error : { projectId: project.id },
      );
      toast.error("プロジェクトの更新に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-text-primary">
          プロジェクト編集
        </h1>
        <p className="mt-2 text-text-secondary">
          「{project.name}」を編集します
        </p>
      </div>

      {/* フォーム */}
      <Card>
        <Card.Body>
          <ProjectForm
            project={project}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={updateProject.isPending}
          />
        </Card.Body>
      </Card>
    </>
  );
}
