import { v7 as uuid } from "uuid";
import { Result } from "@/util/result";
import { todoDummyFrom } from "./todo.entity.dummy";
import type {
  TodoRepository,
  SaveResult,
  FindByIdResult,
  FindAllResult,
  FindByStatusResult,
  FindByProjectIdResult,
  RemoveResult,
} from "./todo.repository";
import type { TodoStatus } from "./todo.entity";

export type TodoRepositoryDummyProps = {
  todoIdReturnValue?: string | undefined;
  attachmentIdReturnValue?: string | undefined;
  findByIdReturnValue?: FindByIdResult | undefined;
  findAllReturnValue?: FindAllResult | undefined;
  findByStatusReturnValue?: FindByStatusResult | undefined;
  findByProjectIdReturnValue?: FindByProjectIdResult | undefined;
  saveReturnValue?: SaveResult | undefined;
  removeReturnValue?: RemoveResult | undefined;
};

/**
 * TodoRepositoryのダミー実装
 *
 * テスト用にTodoRepositoryの各メソッドの戻り値を制御できる。
 * コンストラクタでPropsを渡すことで、任意の値を返すようにできる。
 */
export class TodoRepositoryDummy implements TodoRepository {
  readonly #todoIdReturnValue: string;

  readonly #attachmentIdReturnValue: string;

  readonly #findByIdReturnValue: FindByIdResult;

  readonly #findAllReturnValue: FindAllResult;

  readonly #findByStatusReturnValue: FindByStatusResult;

  readonly #findByProjectIdReturnValue: FindByProjectIdResult;

  readonly #saveReturnValue: SaveResult;

  readonly #removeReturnValue: RemoveResult;

  constructor(props?: TodoRepositoryDummyProps) {
    this.#todoIdReturnValue = props?.todoIdReturnValue ?? uuid();
    this.#attachmentIdReturnValue = props?.attachmentIdReturnValue ?? uuid();
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(todoDummyFrom());
    this.#findAllReturnValue =
      props?.findAllReturnValue ?? Result.ok([todoDummyFrom()]);
    this.#findByStatusReturnValue =
      props?.findByStatusReturnValue ?? Result.ok([todoDummyFrom()]);
    this.#findByProjectIdReturnValue =
      props?.findByProjectIdReturnValue ?? Result.ok([todoDummyFrom()]);
    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  todoId(): string {
    return this.#todoIdReturnValue;
  }

  attachmentId(): string {
    return this.#attachmentIdReturnValue;
  }

  async findById(_props: { id: string }): Promise<FindByIdResult> {
    return this.#findByIdReturnValue;
  }

  async findAll(): Promise<FindAllResult> {
    return this.#findAllReturnValue;
  }

  async findByStatus(_props: {
    status: TodoStatus;
  }): Promise<FindByStatusResult> {
    return this.#findByStatusReturnValue;
  }

  async findByProjectId(_props: {
    projectId: string;
  }): Promise<FindByProjectIdResult> {
    return this.#findByProjectIdReturnValue;
  }

  async save(_props: { todo: unknown }): Promise<SaveResult> {
    return this.#saveReturnValue;
  }

  async remove(_props: { id: string }): Promise<RemoveResult> {
    return this.#removeReturnValue;
  }
}
