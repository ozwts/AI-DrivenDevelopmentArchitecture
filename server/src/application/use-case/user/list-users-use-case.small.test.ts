import { describe, expect, test } from "vitest";
import { ListUsersUseCaseImpl } from "./list-users-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("ListUsersUseCase", () => {
  describe("正常系", () => {
    test("全ユーザーを取得できる", async () => {
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

      const useCase = new ListUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1, user2, user3]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(3);
        expect(result.data.map((u) => u.id)).toContain("user-1");
        expect(result.data.map((u) => u.id)).toContain("user-2");
        expect(result.data.map((u) => u.id)).toContain("user-3");
      }
    });

    test("ユーザーが0件の場合は空配列を返す", async () => {
      const useCase = new ListUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("名前を指定して検索できる", async () => {
      const user1 = userDummyFrom({ id: "user-1", name: "山田太郎" });
      const user2 = userDummyFrom({ id: "user-2", name: "山田花子" });

      const useCase = new ListUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByNameContainsReturnValue: Result.ok([user1, user2]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ name: "山田" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("山田太郎");
        expect(result.data[1].name).toBe("山田花子");
      }
    });
  });

  describe("異常系", () => {
    test("リポジトリがエラーを返す場合はUnexpectedErrorを返す", async () => {
      const useCase = new ListUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
