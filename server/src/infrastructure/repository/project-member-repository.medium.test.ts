import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildProjectMembersTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { ProjectMemberRepositoryImpl } from "./project-member-repository";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";

const { ddb, ddbDoc } = buildDdbClients();
const projectMembersTableName = getRandomIdentifier();

const setUpDependencies = (): {
  projectMemberRepository: ProjectMemberRepository;
} => {
  const logger = new LoggerDummy();
  const projectMemberRepository = new ProjectMemberRepositoryImpl({
    ddbDoc,
    projectMembersTableName,
    logger,
  });

  return {
    projectMemberRepository,
  };
};

beforeEach(async () => {
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
      TableName: projectMembersTableName,
    }),
  );
});

describe("ProjectMemberRepositoryImpl", () => {
  describe("projectMemberId", () => {
    test("[正常系] 新しいProjectMember IDを生成する", () => {
      const { projectMemberRepository } = setUpDependencies();

      const id1 = projectMemberRepository.projectMemberId();
      const id2 = projectMemberRepository.projectMemberId();

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
    test("[正常系] ProjectMemberを保存する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const memberId = projectMemberRepository.projectMemberId();
      const projectId = "project-123";
      const userId = "user-123";

      const member = projectMemberDummyFrom({
        id: memberId,
        projectId,
        userId,
        role: MemberRole.owner(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const saveResult = await projectMemberRepository.save({
        projectMember: member,
      });
      expect(saveResult.isOk()).toBe(true);

      // 保存したメンバーを取得して確認
      const findResult = await projectMemberRepository.findByProjectIdAndUserId(
        {
          projectId,
          userId,
        },
      );
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toStrictEqual(member);
      }
    });

    test("[正常系] 既存のProjectMemberを更新する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const memberId = projectMemberRepository.projectMemberId();
      const projectId = "project-456";
      const userId = "user-456";

      const originalMember = projectMemberDummyFrom({
        id: memberId,
        projectId,
        userId,
        role: MemberRole.member(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectMemberRepository.save({ projectMember: originalMember });

      // オーナーに昇格
      const promotedMember = originalMember.promote(
        "2024-01-02T00:00:00.000+09:00",
      );

      const updateResult = await projectMemberRepository.save({
        projectMember: promotedMember,
      });
      expect(updateResult.isOk()).toBe(true);

      const findResult = await projectMemberRepository.findByProjectIdAndUserId(
        {
          projectId,
          userId,
        },
      );
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.role.isOwner()).toBe(true);
        expect(findResult.data?.updatedAt).toBe("2024-01-02T00:00:00.000+09:00");
      }
    });
  });

  describe("findByProjectId", () => {
    test("[正常系] プロジェクトIDでメンバー一覧を取得する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const projectId = "project-789";
      const member1 = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId: "user-1",
        role: MemberRole.owner(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const member2 = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId: "user-2",
        role: MemberRole.member(),
        createdAt: "2024-01-01T01:00:00.000+09:00",
        updatedAt: "2024-01-01T01:00:00.000+09:00",
      });

      await projectMemberRepository.save({ projectMember: member1 });
      await projectMemberRepository.save({ projectMember: member2 });

      const findResult = await projectMemberRepository.findByProjectId({
        projectId,
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toHaveLength(2);
        expect(findResult.data.map((m) => m.userId)).toContain("user-1");
        expect(findResult.data.map((m) => m.userId)).toContain("user-2");
      }
    });

    test("[正常系] メンバーが存在しない場合、空配列を返す", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const findResult = await projectMemberRepository.findByProjectId({
        projectId: "non-existent-project",
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toEqual([]);
      }
    });
  });

  describe("findByProjectIdAndUserId", () => {
    test("[正常系] プロジェクトIDとユーザーIDでメンバーを取得する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const projectId = "project-abc";
      const userId = "user-abc";
      const member = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId,
        role: MemberRole.owner(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectMemberRepository.save({ projectMember: member });

      const findResult = await projectMemberRepository.findByProjectIdAndUserId(
        {
          projectId,
          userId,
        },
      );
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toStrictEqual(member);
      }
    });

    test("[正常系] 存在しないメンバーを検索するとundefinedを返す", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const findResult = await projectMemberRepository.findByProjectIdAndUserId(
        {
          projectId: "non-existent-project",
          userId: "non-existent-user",
        },
      );
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("countOwnersByProjectId", () => {
    test("[正常系] プロジェクトのオーナー数を取得する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const projectId = "project-count";
      const owner1 = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId: "owner-1",
        role: MemberRole.owner(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });
      const owner2 = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId: "owner-2",
        role: MemberRole.owner(),
        createdAt: "2024-01-01T01:00:00.000+09:00",
        updatedAt: "2024-01-01T01:00:00.000+09:00",
      });
      const member = projectMemberDummyFrom({
        id: projectMemberRepository.projectMemberId(),
        projectId,
        userId: "member-1",
        role: MemberRole.member(),
        createdAt: "2024-01-01T02:00:00.000+09:00",
        updatedAt: "2024-01-01T02:00:00.000+09:00",
      });

      await projectMemberRepository.save({ projectMember: owner1 });
      await projectMemberRepository.save({ projectMember: owner2 });
      await projectMemberRepository.save({ projectMember: member });

      const countResult = await projectMemberRepository.countOwnersByProjectId({
        projectId,
      });
      expect(countResult.isOk()).toBe(true);
      if (countResult.isOk()) {
        expect(countResult.data).toBe(2);
      }
    });

    test("[正常系] オーナーが存在しない場合、0を返す", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const countResult = await projectMemberRepository.countOwnersByProjectId({
        projectId: "non-existent-project",
      });
      expect(countResult.isOk()).toBe(true);
      if (countResult.isOk()) {
        expect(countResult.data).toBe(0);
      }
    });
  });

  describe("remove", () => {
    test("[正常系] 存在するProjectMemberを削除する", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const memberId = projectMemberRepository.projectMemberId();
      const projectId = "project-remove";
      const userId = "user-remove";

      const member = projectMemberDummyFrom({
        id: memberId,
        projectId,
        userId,
        role: MemberRole.member(),
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      await projectMemberRepository.save({ projectMember: member });

      const removeResult = await projectMemberRepository.remove({
        id: memberId,
      });
      expect(removeResult.isOk()).toBe(true);

      const findResult = await projectMemberRepository.findByProjectIdAndUserId(
        {
          projectId,
          userId,
        },
      );
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });

    test("[正常系] 存在しないProjectMemberの削除は成功する（冪等性）", async () => {
      const { projectMemberRepository } = setUpDependencies();

      const removeResult = await projectMemberRepository.remove({
        id: "non-existent-id",
      });
      expect(removeResult.isOk()).toBe(true);
    });
  });
});
