import { Hono } from "hono";
import type { Container } from "inversify";
import { buildListProjectsHandler } from "./list-projects-handler";
import { buildGetProjectHandler } from "./get-project-handler";
import { buildCreateProjectHandler } from "./create-project-handler";
import { buildUpdateProjectHandler } from "./update-project-handler";
import { buildDeleteProjectHandler } from "./delete-project-handler";

export const buildProjectRouter = ({
  container,
}: {
  container: Container;
}): Hono => {
  const projectRouter = new Hono();

  // GET /projects - プロジェクト一覧
  projectRouter.get("/", buildListProjectsHandler({ container }));

  // POST /projects - プロジェクト登録
  projectRouter.post("/", buildCreateProjectHandler({ container }));

  // GET /projects/:projectId - プロジェクト詳細
  projectRouter.get("/:projectId", buildGetProjectHandler({ container }));

  // PUT /projects/:projectId - プロジェクト更新
  projectRouter.put("/:projectId", buildUpdateProjectHandler({ container }));

  // DELETE /projects/:projectId - プロジェクト削除
  projectRouter.delete("/:projectId", buildDeleteProjectHandler({ container }));

  return projectRouter;
};
