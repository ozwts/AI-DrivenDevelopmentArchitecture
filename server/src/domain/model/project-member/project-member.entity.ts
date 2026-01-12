import { MemberRole } from "./member-role.vo";

/**
 * ProjectMember コンストラクタのProps型
 */
export type ProjectMemberProps = {
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
};

/**
 * プロジェクトメンバーエンティティ
 *
 * プロジェクトに参加しているユーザーを表すドメインエンティティ。
 * プロジェクトの子エンティティとして、ユーザーとロールの関連を管理する。
 *
 * ロールの種類：
 * - OWNER: プロジェクトの管理権限を持つ。メンバー招待・削除・権限変更、プロジェクト削除が可能
 * - MEMBER: プロジェクト内のTODO操作が可能。管理権限なし
 *
 * @example
 * ```typescript
 * // プロジェクトメンバーの作成
 * const member = ProjectMember.from({
 *   id: "member-123",
 *   projectId: "project-123",
 *   userId: "user-123",
 *   role: MemberRole.owner(),
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // オーナーに昇格（新しいインスタンスを生成）
 * const promoted = member.promote("2024-01-02T00:00:00.000Z");
 * ```
 */
export class ProjectMember {
  /**
   * プロジェクトメンバーID
   *
   * プロジェクトメンバーを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * プロジェクトID
   *
   * 所属するプロジェクトのID。
   */
  readonly projectId: string;

  /**
   * ユーザーID
   *
   * 参加しているユーザーのID。
   */
  readonly userId: string;

  /**
   * ロール
   *
   * プロジェクトメンバーの権限種別。
   * OWNERまたはMEMBER。
   */
  readonly role: MemberRole;

  /**
   * 作成日時
   *
   * プロジェクトメンバーが作成された日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly createdAt: string;

  /**
   * 更新日時
   *
   * プロジェクトメンバーが最後に更新された日時（ISO 8601形式）。
   * ロールが変更されるたびに更新される。
   */
  readonly updatedAt: string;

  private constructor(props: ProjectMemberProps) {
    this.id = props.id;
    this.projectId = props.projectId;
    this.userId = props.userId;
    this.role = props.role;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * ProjectMemberインスタンスを生成する
   *
   * @param props - プロジェクトメンバーのプロパティ
   * @returns ProjectMemberインスタンス
   */
  static from(props: ProjectMemberProps): ProjectMember {
    return new ProjectMember(props);
  }

  /**
   * メンバーをオーナーに昇格する
   *
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectMemberインスタンス
   */
  promote(updatedAt: string): ProjectMember {
    return new ProjectMember({
      ...this,
      role: MemberRole.owner(),
      updatedAt,
    });
  }

  /**
   * オーナーをメンバーに降格する
   *
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectMemberインスタンス
   */
  demote(updatedAt: string): ProjectMember {
    return new ProjectMember({
      ...this,
      role: MemberRole.member(),
      updatedAt,
    });
  }

  /**
   * オーナーかどうか
   */
  isOwner(): boolean {
    return this.role.isOwner();
  }

  /**
   * メンバーかどうか
   */
  isMember(): boolean {
    return this.role.isMember();
  }
}
