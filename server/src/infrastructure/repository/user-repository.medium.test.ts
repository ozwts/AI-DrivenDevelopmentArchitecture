import { describe, test, expect, beforeEach } from "vitest";
import { UserRepositoryImpl } from "./user-repository";
import { LoggerDummy } from "@/application/port/logger/dummy";
import {
  buildDdbClients,
  refreshTable,
  buildUsersTableParams,
  getRandomIdentifier,
} from "@/util/testing-util/dynamodb";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import type { User } from "@/domain/model/user/user.entity";

describe("UserRepositoryImplのテスト (Medium)", () => {
  const { ddb, ddbDoc } = buildDdbClients();
  const usersTableName = `users-${getRandomIdentifier()}`;
  const logger = new LoggerDummy();

  beforeEach(async () => {
    await refreshTable(buildUsersTableParams({ ddb, usersTableName }));
  });

  describe("save & findById", () => {
    test("[正常系] ユーザーを保存して取得できること", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const user = userDummyFrom({
        id: repository.userId(),
        sub: "cognito-sub-123",
        name: "テストユーザー",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      const saveResult = await repository.save({ user });
      expect(saveResult.isOk()).toBe(true);

      const findResult = await repository.findById({ id: user.id });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeDefined();
        expect(findResult.data?.id).toBe(user.id);
        expect(findResult.data?.sub).toBe("cognito-sub-123");
        expect(findResult.data?.name).toBe("テストユーザー");
        expect(findResult.data?.email).toBe("test@example.com");
        expect(findResult.data?.emailVerified).toBe(true);
      }
    });

    test("[正常系] 存在しないIDで検索した場合はundefinedを返すこと", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const findResult = await repository.findById({ id: "non-existent-id" });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("findBySub", () => {
    test("[正常系] subでユーザーを検索できること", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const user = userDummyFrom({
        id: repository.userId(),
        sub: "cognito-sub-unique-123",
        name: "テストユーザー",
        email: "test@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      await repository.save({ user });

      const findResult = await repository.findBySub({
        sub: "cognito-sub-unique-123",
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeDefined();
        expect(findResult.data?.sub).toBe("cognito-sub-unique-123");
        expect(findResult.data?.id).toBe(user.id);
      }
    });

    test("[正常系] 存在しないsubで検索した場合はundefinedを返すこと", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const findResult = await repository.findBySub({
        sub: "non-existent-sub",
      });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("findAll", () => {
    test("[正常系] 全ユーザーを取得できること", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const user1 = userDummyFrom({
        id: repository.userId(),
        sub: "sub-1",
        name: "ユーザー1",
        email: "user1@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      const user2 = userDummyFrom({
        id: repository.userId(),
        sub: "sub-2",
        name: "ユーザー2",
        email: "user2@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      await repository.save({ user: user1 });
      await repository.save({ user: user2 });

      const findAllResult = await repository.findAll();
      expect(findAllResult.isOk()).toBe(true);
      if (findAllResult.isOk()) {
        expect(findAllResult.data).toHaveLength(2);
        expect(findAllResult.data.map((u: User) => u.id)).toContain(user1.id);
        expect(findAllResult.data.map((u: User) => u.id)).toContain(user2.id);
      }
    });

    test("[正常系] ユーザーが存在しない場合は空配列を返すこと", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const findAllResult = await repository.findAll();
      expect(findAllResult.isOk()).toBe(true);
      if (findAllResult.isOk()) {
        expect(findAllResult.data).toEqual([]);
      }
    });
  });

  describe("remove", () => {
    test("[正常系] ユーザーを削除できること", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const user = userDummyFrom({
        id: repository.userId(),
        sub: "sub-to-delete",
        name: "削除ユーザー",
        email: "delete@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      await repository.save({ user });

      const removeResult = await repository.remove({ id: user.id });
      expect(removeResult.isOk()).toBe(true);

      const findResult = await repository.findById({ id: user.id });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeUndefined();
      }
    });
  });

  describe("update (save)", () => {
    test("[正常系] ユーザー情報を更新できること", async () => {
      const repository = new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
      });

      const user = userDummyFrom({
        id: repository.userId(),
        sub: "sub-update",
        name: "旧名前",
        email: "old@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      await repository.save({ user });

      const updatedUser = user
        .rename("新名前", "2024-01-02T00:00:00.000Z")
        .verifyEmail("new@example.com", true, "2024-01-02T00:00:00.000Z");

      const saveResult = await repository.save({ user: updatedUser });
      expect(saveResult.isOk()).toBe(true);

      const findResult = await repository.findById({ id: user.id });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data).toBeDefined();
        expect(findResult.data?.name).toBe("新名前");
        expect(findResult.data?.email).toBe("new@example.com");
        expect(findResult.data?.emailVerified).toBe(true);
        expect(findResult.data?.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      }
    });
  });
});
