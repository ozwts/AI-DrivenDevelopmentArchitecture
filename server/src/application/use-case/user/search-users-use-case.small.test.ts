import { describe, expect, test } from "vitest";
import { SearchUsersUseCaseImpl } from "./search-users-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("SearchUsersUseCase", () => {
  describe("正常系", () => {
    test("キーワードで名前を部分一致検索できる", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "田中太郎",
        email: "tanaka@example.com",
      });
      const user2 = userDummyFrom({
        id: "user-2",
        name: "山田花子",
        email: "yamada@example.com",
      });
      const user3 = userDummyFrom({
        id: "user-3",
        name: "田中次郎",
        email: "tanaka2@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1, user2, user3]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "田中",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((u) => u.id)).toContain("user-1");
        expect(result.data.map((u) => u.id)).toContain("user-3");
      }
    });

    test("キーワードでメールアドレスを部分一致検索できる", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "田中太郎",
        email: "tanaka@example.com",
      });
      const user2 = userDummyFrom({
        id: "user-2",
        name: "山田花子",
        email: "yamada@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1, user2]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "yamada",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("user-2");
      }
    });

    test("大文字小文字を区別しない検索ができる", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "Tanaka",
        email: "tanaka@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "TANAKA",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("user-1");
      }
    });

    test("自分自身は検索結果から除外される", async () => {
      const currentUser = userDummyFrom({
        id: "current-user",
        name: "田中太郎",
        email: "tanaka@example.com",
      });
      const otherUser = userDummyFrom({
        id: "other-user",
        name: "田中次郎",
        email: "tanaka2@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([currentUser, otherUser]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "田中",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].id).toBe("other-user");
      }
    });

    test("検索キーワードが空の場合は空の一覧を返す", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "田中太郎",
        email: "tanaka@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("検索キーワードが空白のみの場合は空の一覧を返す", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "田中太郎",
        email: "tanaka@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "   ",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("該当するユーザーがいない場合は空配列を返す", async () => {
      const user1 = userDummyFrom({
        id: "user-1",
        name: "田中太郎",
        email: "tanaka@example.com",
      });

      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.ok([user1]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "山田",
        currentUserId: "current-user",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("異常系", () => {
    test("リポジトリがエラーを返す場合はUnexpectedErrorを返す", async () => {
      const useCase = new SearchUsersUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findAllReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        keyword: "test",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
