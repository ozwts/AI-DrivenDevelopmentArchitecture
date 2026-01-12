import { v7 as uuid } from "uuid";
import { Result } from "@/util/result";
import { projectMemberDummyFrom } from "./project-member.entity.dummy";
import type {
  ProjectMemberRepository,
  SaveResult,
  FindByIdResult,
  FindByProjectIdResult,
  FindByProjectIdAndUserIdResult,
  FindByUserIdResult,
  CountOwnersByProjectIdResult,
  RemoveResult,
} from "./project-member.repository";

export type ProjectMemberRepositoryDummyProps = {
  projectMemberIdReturnValue?: string | undefined;
  findByIdReturnValue?: FindByIdResult | undefined;
  findByProjectIdReturnValue?: FindByProjectIdResult | undefined;
  findByProjectIdAndUserIdReturnValue?:
    | FindByProjectIdAndUserIdResult
    | undefined;
  findByUserIdReturnValue?: FindByUserIdResult | undefined;
  countOwnersByProjectIdReturnValue?:
    | CountOwnersByProjectIdResult
    | undefined;
  saveReturnValue?: SaveResult | undefined;
  removeReturnValue?: RemoveResult | undefined;
};

/**
 * ProjectMemberRepositoryのダミー実装
 *
 * テスト用にProjectMemberRepositoryの各メソッドの戻り値を制御できる。
 * コンストラクタでPropsを渡すことで、任意の値を返すようにできる。
 */
export class ProjectMemberRepositoryDummy implements ProjectMemberRepository {
  readonly #projectMemberIdReturnValue: string;

  readonly #findByIdReturnValue: FindByIdResult;

  readonly #findByProjectIdReturnValue: FindByProjectIdResult;

  readonly #findByProjectIdAndUserIdReturnValue: FindByProjectIdAndUserIdResult;

  readonly #findByUserIdReturnValue: FindByUserIdResult;

  readonly #countOwnersByProjectIdReturnValue: CountOwnersByProjectIdResult;

  readonly #saveReturnValue: SaveResult;

  readonly #removeReturnValue: RemoveResult;

  constructor(props?: ProjectMemberRepositoryDummyProps) {
    this.#projectMemberIdReturnValue =
      props?.projectMemberIdReturnValue ?? uuid();
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(projectMemberDummyFrom());
    this.#findByProjectIdReturnValue =
      props?.findByProjectIdReturnValue ?? Result.ok([projectMemberDummyFrom()]);
    this.#findByProjectIdAndUserIdReturnValue =
      props?.findByProjectIdAndUserIdReturnValue ??
      Result.ok(projectMemberDummyFrom());
    this.#findByUserIdReturnValue =
      props?.findByUserIdReturnValue ?? Result.ok([projectMemberDummyFrom()]);
    this.#countOwnersByProjectIdReturnValue =
      props?.countOwnersByProjectIdReturnValue ?? Result.ok(1);
    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  projectMemberId(): string {
    return this.#projectMemberIdReturnValue;
  }

  findById(_props: { id: string }): Promise<FindByIdResult> {
    return Promise.resolve(this.#findByIdReturnValue);
  }

  findByProjectId(_props: {
    projectId: string;
  }): Promise<FindByProjectIdResult> {
    return Promise.resolve(this.#findByProjectIdReturnValue);
  }

  findByProjectIdAndUserId(_props: {
    projectId: string;
    userId: string;
  }): Promise<FindByProjectIdAndUserIdResult> {
    return Promise.resolve(this.#findByProjectIdAndUserIdReturnValue);
  }

  findByUserId(_props: { userId: string }): Promise<FindByUserIdResult> {
    return Promise.resolve(this.#findByUserIdReturnValue);
  }

  countOwnersByProjectId(_props: {
    projectId: string;
  }): Promise<CountOwnersByProjectIdResult> {
    return Promise.resolve(this.#countOwnersByProjectIdReturnValue);
  }

  save(_props: { projectMember: unknown }): Promise<SaveResult> {
    return Promise.resolve(this.#saveReturnValue);
  }

  remove(_props: { id: string }): Promise<RemoveResult> {
    return Promise.resolve(this.#removeReturnValue);
  }
}
