import { useNavigate } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { Button, Card } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";
import { useToast } from "@/app/features/toast";
import { useCreateProject } from "@/app/features/project";
import { ProjectForm } from "../_shared";

const logger = buildLogger("NewProjectRoute");

type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;

/**
 * プロジェクト作成ページ
 * 責務: 新規プロジェクトの作成
 */
export default function NewProjectRoute() {
  const navigate = useNavigate();
  const toast = useToast();
  const createProject = useCreateProject();

  const handleSubmit = async (data: CreateProjectParams) => {
    logger.info("プロジェクト作成開始", { name: data.name });
    try {
      await createProject.mutateAsync(data);
      logger.info("プロジェクト作成成功");
      toast.success("プロジェクトを作成しました");
      navigate("/projects");
    } catch (error) {
      logger.error("プロジェクト作成失敗", error instanceof Error ? error : { message: String(error) });
      toast.error("プロジェクトの作成に失敗しました");
    }
  };

  const handleCancel = () => {
    navigate("/projects");
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/projects")}
          className="mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          プロジェクト一覧に戻る
        </Button>
        <h1 className="text-3xl font-bold text-text-primary">
          新規プロジェクト
        </h1>
        <p className="mt-2 text-text-secondary">
          新しいプロジェクトを作成します
        </p>
      </div>

      {/* フォーム */}
      <Card>
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createProject.isPending}
        />
      </Card>
    </div>
  );
}
