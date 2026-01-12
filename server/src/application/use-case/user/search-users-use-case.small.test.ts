import { test, expect, describe } from "vitest";
import { SearchUsersUseCaseImpl } from "./search-users-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("SearchUsersUseCaseのテスト", () => {
  describe("execute", () => {
    test("名前で検索してユーザー一覧を取得できること", async () => {
      const user1 = userDummyFrom({ id: "user-1", name: "山田太郎" });
      const user2 = userDummyFrom({ id: "user-2", name: "山田花子" });

      const useCase = new SearchUsersUseCaseImpl({
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

    test("検索結果が空の場合は空配列を返すこと", async () => {
      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByNameContainsReturnValue: Result.ok([]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ name: "存在しない" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
      }
    });

    test("リポジトリエラー時はエラーを返すこと", async () => {
      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByNameContainsReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ name: "検索" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("1件のユーザーを取得できること", async () => {
      const user = userDummyFrom({ id: "user-1", name: "佐藤一郎" });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByNameContainsReturnValue: Result.ok([user]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ name: "佐藤" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("user-1");
      }
    });
  });
});
