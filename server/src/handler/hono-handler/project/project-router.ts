import { Hono } from "hono";
import type { Container } from "inversify";
import { buildListProjectsHandler } from "./list-projects-handler";
import { buildGetProjectHandler } from "./get-project-handler";
import { buildCreateProjectHandler } from "./create-project-handler";
import { buildUpdateProjectHandler } from "./update-project-handler";
import { buildDeleteProjectHandler } from "./delete-project-handler";
import { buildListProjectMembersHandler } from "./list-project-members-handler";
import { buildInviteMemberHandler } from "./invite-member-handler";
import { buildRemoveMemberHandler } from "./remove-member-handler";
import { buildLeaveProjectHandler } from "./leave-project-handler";

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

  // GET /projects/:projectId/members - プロジェクトメンバー一覧
  projectRouter.get(
    "/:projectId/members",
    buildListProjectMembersHandler({ container }),
  );

  // POST /projects/:projectId/members - メンバー招待
  projectRouter.post(
    "/:projectId/members",
    buildInviteMemberHandler({ container }),
  );

  // DELETE /projects/:projectId/members/:userId - メンバー削除
  projectRouter.delete(
    "/:projectId/members/:userId",
    buildRemoveMemberHandler({ container }),
  );

  // POST /projects/:projectId/leave - プロジェクト脱退
  projectRouter.post("/:projectId/leave", buildLeaveProjectHandler({ container }));

  return projectRouter;
};
