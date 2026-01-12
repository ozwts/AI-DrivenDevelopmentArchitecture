import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildProjectsTableParams,
  buildProjectMembersTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { ProjectRepositoryImpl } from "./project-repository";
import type { ProjectRepository } from "@/domain/model/project/project.repository";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project/member-role.vo";

const { ddb, ddbDoc } = buildDdbClients();
const projectsTableName = getRandomIdentifier();
const projectMembersTableName = getRandomIdentifier();

const setUpDependencies = (): {
  projectRepository: ProjectRepository;
} => {
  const logger = new LoggerDummy();
  const projectRepository = new ProjectRepositoryImpl({
    ddbDoc,
    projectsTableName,
    projectMembersTableName,
    logger,
  });

  return {
    projectRepository,
  };
};

beforeEach(async () => {
  await refreshTable(
    buildProjectsTableParams({
      ddb,
      projectsTableName,
    }),
  );
  await refreshTable(
    buildProjectMembersTableParams({
      ddb,
      projectMembersTableName,
    }),
  );
});

afterAll(async () => {
  await ddb.send(
    new DeleteTableCommand({
      TableName: projectsTableName,
    }),
  );
  await ddb.send(
    new DeleteTableCommand({
      TableName: projectMembersTableName,
    }),
  );
});

describe("ProjectRepositoryImpl", () => {
  describe("projectId", () => {
    test("[正常系] 新しいProject IDを生成する", () => {
      const { projectRepository } = setUpDependencies();

      const id1 = projectRepository.projectId();
      const id2 = projectRepository.projectId();

      // UUIDの形式を満たしている
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      // 毎回異なるIDが生成される
      expect(id1).not.toBe(id2);
    });
  });

  describe("save", () => {
    test("[正常系] 包括的なProject操作（全フィールド）", async () => {
      const { projectRepository } = setUpDependencies();

      // 1. 包括的なプロジェクトを作成・保存
      const projectId = projectRepository.projectId();

      const project = projectDummyFrom({
        id: projectId,
        name: "要件定義プロジェクト",
        description: "新システムの要件定義を行うプロジェクト",
        color: "#FF5733",
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const saveResult = await projectRepository.save({ project });
      expect(saveResult.isOk()).toBe(true);

      // 2. 保存したプロジェクトを取得して確認
      const findResult = await projectRepository.findById({
        id: projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toStrictEqual(project);
      }
    });

    test("[正常系] 最小限のProject操作（必須フィールドのみ）", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();

      const project = projectDummyFrom({
        id: projectId,
        name: "最小限プロジェクト",
        color: "#3498DB",
        createdAt: "2024-01-02T00:00:00.000+09:00",
        updatedAt: "2024-01-02T00:00:00.000+09:00",
      });

      const saveResult = await projectRepository.save({ project });
      expect(saveResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({
        id: projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toStrictEqual(project);
        // descriptionは常に設定される（ランダムなダミー値）
        expect(findResult.data?.description).toBeDefined();
      }
    });

    test("[正常系] 既存のProjectを更新する", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();

      const originalProject = projectDummyFrom({
        id: projectId,
        name: "元のプロジェクト",
        color: "#2ECC71",
        createdAt: "2024-01-03T00:00:00.000+09:00",
        updatedAt: "2024-01-03T00:00:00.000+09:00",
      });

      await projectRepository.save({ project: originalProject });

      // 名前と説明を更新
      const updatedProject = originalProject
        .rename("更新後のプロジェクト", "2024-01-03T12:00:00.000+09:00")
        .clarify("新しい説明", "2024-01-03T12:00:00.000+09:00");

      const updateResult = await projectRepository.save({
        project: updatedProject,
      });
      expect(updateResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({
        id: projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.name).toBe("更新後のプロジェクト");
        expect(findResult.data?.description).toBe("新しい説明");
        expect(findResult.data?.updatedAt).toBe(
          "2024-01-03T12:00:00.000+09:00",
        );
      }
    });
  });

  describe("findById", () => {
    test("[正常系] 存在するProjectをIDで取得する", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();

      const project = projectDummyFrom({
        id: projectId,
        name: "検索テストプロジェクト",
        color: "#9B59B6",
        createdAt: "2024-01-04T00:00:00.000+09:00",
        updatedAt: "2024-01-04T00:00:00.000+09:00",
      });

      await projectRepository.save({ project });

      const findResult = await projectRepository.findById({
        id: projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toStrictEqual(project);
      }
    });

    test("[正常系] 存在しないProjectを検索するとundefinedを返す", async () => {
      const { projectRepository } = setUpDependencies();

      const findResult = await projectRepository.findById({
        id: "non-existent-id",
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("findAll", () => {
    test("[正常系] 全てのProjectを取得する", async () => {
      const { projectRepository } = setUpDependencies();

      const project1 = projectDummyFrom({
        id: projectRepository.projectId(),
        name: "全件検索プロジェクト1",
        color: "#E74C3C",
        createdAt: "2024-01-10T00:00:00.000+09:00",
        updatedAt: "2024-01-10T00:00:00.000+09:00",
      });
      const project2 = projectDummyFrom({
        id: projectRepository.projectId(),
        name: "全件検索プロジェクト2",
        color: "#F39C12",
        createdAt: "2024-01-10T01:00:00.000+09:00",
        updatedAt: "2024-01-10T01:00:00.000+09:00",
      });

      await projectRepository.save({ project: project1 });
      await projectRepository.save({ project: project2 });

      const findAllResult = await projectRepository.findAll();
      expect(findAllResult.isOk()).toBe(true);
      if (findAllResult.isOk()) {
        expect(findAllResult.data).toHaveLength(2);
        expect(findAllResult.data.map((p) => p.id)).toContain(project1.id);
        expect(findAllResult.data.map((p) => p.id)).toContain(project2.id);
      }
    });

    test("[正常系] Projectが存在しない場合、空配列を返す", async () => {
      const { projectRepository } = setUpDependencies();

      const findAllResult = await projectRepository.findAll();
      expect(findAllResult.isOk()).toBe(true);
      if (findAllResult.isOk()) {
        expect(findAllResult.data).toEqual([]);
      }
    });
  });

  describe("remove", () => {
    test("[正常系] 存在するProjectを削除する", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();

      const project = projectDummyFrom({
        id: projectId,
        name: "削除テストプロジェクト",
        color: "#1ABC9C",
        createdAt: "2024-01-12T00:00:00.000+09:00",
        updatedAt: "2024-01-12T00:00:00.000+09:00",
      });

      await projectRepository.save({ project });

      const removeResult = await projectRepository.remove({
        id: projectId,
      });
      expect(removeResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({
        id: projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("projectMemberId", () => {
    test("[正常系] 新しいProjectMember IDを生成する", () => {
      const { projectRepository } = setUpDependencies();

      const id1 = projectRepository.projectMemberId();
      const id2 = projectRepository.projectMemberId();

      // UUIDの形式を満たしている
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      // 毎回異なるIDが生成される
      expect(id1).not.toBe(id2);
    });
  });

  describe("メンバー管理", () => {
    test("[正常系] メンバー付きのProjectを保存・取得できる", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();
      const ownerMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-user-id",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const regularMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "member-user-id",
        role: MemberRole.member(),
        joinedAt: "2024-01-02T00:00:00.000+09:00",
      });

      const project = projectDummyFrom({
        id: projectId,
        name: "メンバー付きプロジェクト",
        color: "#FF5733",
        members: [ownerMember, regularMember],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const saveResult = await projectRepository.save({ project });
      expect(saveResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({ id: projectId });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.members).toHaveLength(2);
        const memberIds = findResult.data?.members.map((m) => m.id);
        expect(memberIds).toContain(ownerMember.id);
        expect(memberIds).toContain(regularMember.id);

        const owner = findResult.data?.members.find(
          (m) => m.id === ownerMember.id,
        );
        expect(owner?.role.isOwner()).toBe(true);
        expect(owner?.userId).toBe("owner-user-id");

        const member = findResult.data?.members.find(
          (m) => m.id === regularMember.id,
        );
        expect(member?.role.isMember()).toBe(true);
        expect(member?.userId).toBe("member-user-id");
      }
    });

    test("[正常系] メンバーを追加できる", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();
      const ownerMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-user-id",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const project = projectDummyFrom({
        id: projectId,
        name: "メンバー追加テスト",
        color: "#3498DB",
        members: [ownerMember],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectRepository.save({ project });

      // 新しいメンバーを追加
      const newMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "new-member-id",
        role: MemberRole.member(),
        joinedAt: "2024-01-03T00:00:00.000+09:00",
      });

      const updatedProject = project.addMember(
        newMember,
        "2024-01-03T00:00:00.000+09:00",
      );

      const updateResult = await projectRepository.save({
        project: updatedProject,
      });
      expect(updateResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({ id: projectId });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.members).toHaveLength(2);
        const memberIds = findResult.data?.members.map((m) => m.id);
        expect(memberIds).toContain(newMember.id);
      }
    });

    test("[正常系] メンバーを削除できる", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();
      const ownerMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-user-id",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const memberToRemove = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "remove-user-id",
        role: MemberRole.member(),
        joinedAt: "2024-01-02T00:00:00.000+09:00",
      });

      const project = projectDummyFrom({
        id: projectId,
        name: "メンバー削除テスト",
        color: "#9B59B6",
        members: [ownerMember, memberToRemove],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectRepository.save({ project });

      // メンバーを削除（memberIdを使用）
      const updatedProject = project.removeMember(
        memberToRemove.id,
        "2024-01-04T00:00:00.000+09:00",
      );

      const updateResult = await projectRepository.save({
        project: updatedProject,
      });
      expect(updateResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({ id: projectId });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.members).toHaveLength(1);
        expect(findResult.data?.members[0].id).toBe(ownerMember.id);
      }
    });

    test("[正常系] Projectを削除するとメンバーも削除される", async () => {
      const { projectRepository } = setUpDependencies();

      const projectId = projectRepository.projectId();
      const ownerMember = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-user-id",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const project = projectDummyFrom({
        id: projectId,
        name: "削除テスト",
        color: "#E74C3C",
        members: [ownerMember],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectRepository.save({ project });

      const removeResult = await projectRepository.remove({ id: projectId });
      expect(removeResult.isOk()).toBe(true);

      const findResult = await projectRepository.findById({ id: projectId });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });

    test("[正常系] findAllでメンバー情報も取得できる", async () => {
      const { projectRepository } = setUpDependencies();

      const project1Id = projectRepository.projectId();
      const project1Owner = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-1",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const project1 = projectDummyFrom({
        id: project1Id,
        name: "プロジェクト1",
        color: "#F39C12",
        members: [project1Owner],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const project2Id = projectRepository.projectId();
      const project2Owner = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "owner-2",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const project2Member = projectMemberDummyFrom({
        id: projectRepository.projectMemberId(),
        userId: "member-2",
        role: MemberRole.member(),
        joinedAt: "2024-01-02T00:00:00.000+09:00",
      });
      const project2 = projectDummyFrom({
        id: project2Id,
        name: "プロジェクト2",
        color: "#1ABC9C",
        members: [project2Owner, project2Member],
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectRepository.save({ project: project1 });
      await projectRepository.save({ project: project2 });

      const findAllResult = await projectRepository.findAll();
      expect(findAllResult.isOk()).toBe(true);
      if (findAllResult.isOk()) {
        expect(findAllResult.data).toHaveLength(2);

        const foundProject1 = findAllResult.data.find(
          (p) => p.id === project1Id,
        );
        expect(foundProject1?.members).toHaveLength(1);
        expect(foundProject1?.members[0].userId).toBe("owner-1");

        const foundProject2 = findAllResult.data.find(
          (p) => p.id === project2Id,
        );
        expect(foundProject2?.members).toHaveLength(2);
        const project2MemberUserIds = foundProject2?.members.map(
          (m) => m.userId,
        );
        expect(project2MemberUserIds).toContain("owner-2");
        expect(project2MemberUserIds).toContain("member-2");
      }
    });
  });
});
