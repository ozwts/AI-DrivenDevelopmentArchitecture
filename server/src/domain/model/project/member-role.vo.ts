import { DomainError } from "../../../util/error-util";
import { Result } from "../../../util/result";

/**
 * MemberRole Props型
 */
export type MemberRoleProps = {
  role: string;
};

type MemberRoleValue = "owner" | "member";

/**
 * MemberRole Value Object
 *
 * プロジェクトメンバーの役割を表すValue Object。
 *
 * 値の種類：
 * - owner: プロジェクトオーナー（メンバー管理権限を持つ）
 * - member: 一般メンバー（Todo操作のみ）
 *
 * Tier 1（Value Object化が必須）として定義。
 * オーナー判定ロジックを内包し、権限チェックに使用される。
 */
export class MemberRole {
  readonly #role: MemberRoleValue;

  private constructor(role: MemberRoleValue) {
    this.#role = role;
  }

  /**
   * オーナーロールを返す
   */
  static owner(): MemberRole {
    return new MemberRole("owner");
  }

  /**
   * メンバーロールを返す
   */
  static member(): MemberRole {
    return new MemberRole("member");
  }

  /**
   * 文字列からMemberRoleを生成する
   *
   * @param props - MemberRoleProps
   * @returns MemberRoleまたはDomainError
   */
  static from(props: MemberRoleProps): Result<MemberRole, DomainError> {
    const validRoles = ["owner", "member"] as const;
    if (!validRoles.includes(props.role as (typeof validRoles)[number])) {
      return Result.err(
        new DomainError(
          `Invalid MemberRole: ${props.role}. Must be one of: ${validRoles.join(", ")}`,
        ),
      );
    }

    return Result.ok(new MemberRole(props.role as (typeof validRoles)[number]));
  }

  /**
   * ロールの値を取得
   */
  get role(): MemberRoleValue {
    return this.#role;
  }

  /**
   * オーナーかどうか
   */
  isOwner(): boolean {
    return this.#role === "owner";
  }

  /**
   * メンバーかどうか
   */
  isMember(): boolean {
    return this.#role === "member";
  }

  /**
   * 値の等価性を判定する
   */
  equals(other: MemberRole): boolean {
    return this.#role === other.#role;
  }

  /**
   * デバッグ・ログ用の文字列表現を返す
   */
  toString(): string {
    return this.#role;
  }
}
