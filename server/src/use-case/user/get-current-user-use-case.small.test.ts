import { beforeEach, describe, expect, it } from "vitest";
import { GetCurrentUserUseCase } from "./get-current-user-use-case";
import type { UserRepository } from "@/domain/model/user/user.repository";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.dummy";
import { NotFoundError } from "@/util/error-util";

describe("GetCurrentUserUseCase", () => {
  let useCase: GetCurrentUserUseCase;
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepositoryDummy();
    useCase = new GetCurrentUserUseCase(userRepository);
  });

  describe("正常系", () => {
    it("Cognito Subからユーザーを取得できる", async () => {
      // Arrange
      const user = userDummyFrom({
        id: "user-1",
        sub: "cognito-sub-123",
        name: "Test User",
        email: "test@example.com",
      });
      userRepository = new UserRepositoryDummy({
        findBySubReturnValue: {
          success: true,
          data: user,
        },
      });
      useCase = new GetCurrentUserUseCase(userRepository);

      // Act
      const result = await useCase.execute({ sub: "cognito-sub-123" });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("user-1");
        expect(result.data.sub).toBe("cognito-sub-123");
        expect(result.data.name).toBe("Test User");
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("異常系", () => {
    it("ユーザーが存在しない場合はNotFoundErrorを返す", async () => {
      // Arrange
      userRepository = new UserRepositoryDummy({
        findBySubReturnValue: {
          success: true,
          data: undefined,
        },
      });
      useCase = new GetCurrentUserUseCase(userRepository);

      // Act
      const result = await useCase.execute({ sub: "non-existent-sub" });

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("ユーザーが見つかりません");
      }
    });
  });
});
