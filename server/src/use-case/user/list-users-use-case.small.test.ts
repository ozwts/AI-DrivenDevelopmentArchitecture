import { beforeEach, describe, expect, it } from "vitest";
import { ListUsersUseCase } from "./list-users-use-case";
import type { UserRepository } from "@/domain/model/user/user-repository";
import { UserRepositoryDummy } from "@/domain/model/user/user-repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.dummy";
import { UnexpectedError } from "@/util/error-util";

describe("ListUsersUseCase", () => {
  let useCase: ListUsersUseCase;
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepositoryDummy();
    useCase = new ListUsersUseCase(userRepository);
  });

  describe("正常系", () => {
    it("全ユーザーを取得できる", async () => {
      // Arrange
      const user1 = userDummyFrom({
        id: "user-1",
        name: "User 1",
        email: "user1@example.com",
      });
      const user2 = userDummyFrom({
        id: "user-2",
        name: "User 2",
        email: "user2@example.com",
      });
      const user3 = userDummyFrom({
        id: "user-3",
        name: "User 3",
        email: "user3@example.com",
      });

      userRepository = new UserRepositoryDummy({
        findAllReturnValue: {
          success: true,
          data: [user1, user2, user3],
        },
      });
      useCase = new ListUsersUseCase(userRepository);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data.map((u) => u.id)).toContain("user-1");
        expect(result.data.map((u) => u.id)).toContain("user-2");
        expect(result.data.map((u) => u.id)).toContain("user-3");
      }
    });

    it("ユーザーが0件の場合は空配列を返す", async () => {
      // Arrange
      userRepository = new UserRepositoryDummy({
        findAllReturnValue: {
          success: true,
          data: [],
        },
      });
      useCase = new ListUsersUseCase(userRepository);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("異常系", () => {
    it("リポジトリがエラーを返す場合はUnexpectedErrorを返す", async () => {
      // Arrange
      userRepository = new UserRepositoryDummy({
        findAllReturnValue: {
          success: false,
          error: new UnexpectedError(),
        },
      });
      useCase = new ListUsersUseCase(userRepository);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
