import { Result } from "@/util/result";
import type {
  UserRepository,
  SaveResult,
  FindByIdResult,
  FindAllResult,
  RemoveResult,
} from "./user.repository";
import { userDummyFrom } from "./user.entity.dummy";

export type UserRepositoryDummyProps = {
  userIdReturnValue?: string;
  findByIdReturnValue?: FindByIdResult;
  findBySubReturnValue?: FindByIdResult;
  findAllReturnValue?: FindAllResult;
  saveReturnValue?: SaveResult;
  removeReturnValue?: RemoveResult;
};

/**
 * UserRepositoryのダミー実装
 *
 * テストでユースケースをテストする際に使用する。
 * 各メソッドの戻り値をコンストラクタで設定可能。
 *
 * @example
 * ```typescript
 * const repository = new UserRepositoryDummy({
 *   findByIdReturnValue: {
 *     success: true,
 *     data: userDummyFrom({ id: "user-123" })
 *   }
 * });
 * ```
 */
export class UserRepositoryDummy implements UserRepository {
  readonly #userIdReturnValue: string;

  readonly #findByIdReturnValue: FindByIdResult;

  readonly #findBySubReturnValue: FindByIdResult;

  readonly #findAllReturnValue: FindAllResult;

  readonly #saveReturnValue: SaveResult;

  readonly #removeReturnValue: RemoveResult;

  constructor(props?: UserRepositoryDummyProps) {
    this.#userIdReturnValue = props?.userIdReturnValue ?? "dummy-user-id";
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(userDummyFrom());
    this.#findBySubReturnValue =
      props?.findBySubReturnValue ?? Result.ok(userDummyFrom());
    this.#findAllReturnValue =
      props?.findAllReturnValue ?? Result.ok([userDummyFrom()]);
    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  userId(): string {
    return this.#userIdReturnValue;
  }

  async findById(_props: { id: string }): Promise<FindByIdResult> {
    return this.#findByIdReturnValue;
  }

  async findBySub(_props: { sub: string }): Promise<FindByIdResult> {
    return this.#findBySubReturnValue;
  }

  async findAll(): Promise<FindAllResult> {
    return this.#findAllReturnValue;
  }

  async save(_props: { user: import("./user.entity").User }): Promise<SaveResult> {
    return this.#saveReturnValue;
  }

  async remove(_props: { id: string }): Promise<RemoveResult> {
    return this.#removeReturnValue;
  }
}
