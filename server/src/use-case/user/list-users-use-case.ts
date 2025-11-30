import { inject, injectable } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { UnexpectedError } from "@/util/error-util";

export type ListUsersUseCaseResult = Result<User[], UnexpectedError>;

/**
 * ユーザー一覧を取得するユースケース
 *
 * すべてのユーザーを取得します。
 */
@injectable()
export class ListUsersUseCase {
  readonly #userRepository: UserRepository;

  constructor(
    @inject(serviceId.USER_REPOSITORY)
    userRepository: UserRepository,
  ) {
    this.#userRepository = userRepository;
  }

  async execute(): Promise<ListUsersUseCaseResult> {
    // リポジトリから全ユーザーを取得
    const findAllResult = await this.#userRepository.findAll();

    if (findAllResult.isErr()) {
      return Result.err(findAllResult.error);
    }

    return Result.ok(findAllResult.data);
  }
}
