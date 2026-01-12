import { DomainError } from "../../../util/error-util";
import { Result } from "../../../util/result";

/**
 * MemberRole Props型
 */
export type MemberRoleProps = {
  role: string;
};

type MemberRoleValue = "OWNER" | "MEMBER";

/**
 * MemberRole Value Object
 *
 * プロジェクトメンバーの権限種別を表すValue Object。
 *
 * 値の種類：
 * - OWNER: プロジェクトの管理権限を持つ。メンバー招待・削除・権限変更、プロジェクト削除が可能
 * - MEMBER: プロジェクト内のTODO操作が可能。管理権限なし
 *
 * Tier 1（Value Object化が必須）として定義。
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
    return new MemberRole("OWNER");
  }

  /**
   * メンバーロールを返す
   */
  static member(): MemberRole {
    return new MemberRole("MEMBER");
  }

  /**
   * 文字列からMemberRoleを生成する
   *
   * @param props - MemberRoleProps
   * @returns MemberRoleまたはDomainError
   */
  static from(props: MemberRoleProps): Result<MemberRole, DomainError> {
    const validRoles = ["OWNER", "MEMBER"] as const;
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
    return this.#role === "OWNER";
  }

  /**
   * メンバーかどうか
   */
  isMember(): boolean {
    return this.#role === "MEMBER";
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
