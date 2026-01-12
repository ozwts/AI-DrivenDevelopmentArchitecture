import { MemberRole } from "./member-role.vo";

/**
 * ProjectMember コンストラクタのProps型
 */
export type ProjectMemberProps = {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
};

/**
 * ProjectMember エンティティ
 *
 * プロジェクトに参加しているメンバーを表すドメインエンティティ。
 * Projectアグリゲートの子エンティティとして、ProjectRepository経由でのみアクセスされる。
 *
 * @remarks
 * - このエンティティは親エンティティ（Project）のIDを持たない
 * - 親子関係はリポジトリ層で管理される（DynamoDBのPK/SK等）
 * - メンバーロール（owner/member）でメンバー管理権限を制御
 *
 * @example
 * ```typescript
 * // ProjectMemberの作成
 * const member = ProjectMember.from({
 *   id: "member-123",
 *   userId: "user-456",
 *   role: MemberRole.owner(),
 *   joinedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // オーナー判定
 * if (member.isOwner()) {
 *   // メンバー管理操作を許可
 * }
 * ```
 */
export class ProjectMember {
  /**
   * ProjectMember ID
   *
   * プロジェクトメンバーを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * ユーザーID
   *
   * 参加しているユーザーのID。
   * 必須項目。
   */
  readonly userId: string;

  /**
   * メンバーロール
   *
   * メンバーの役割（owner/member）。
   * オーナーはメンバー管理権限を持つ。
   */
  readonly role: MemberRole;

  /**
   * 参加日時
   *
   * メンバーがプロジェクトに参加した日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly joinedAt: string;

  private constructor(props: ProjectMemberProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.role = props.role;
    this.joinedAt = props.joinedAt;
  }

  /**
   * ProjectMemberインスタンスを生成する
   *
   * @param props - ProjectMemberのプロパティ
   * @returns ProjectMemberインスタンス
   */
  static from(props: ProjectMemberProps): ProjectMember {
    return new ProjectMember(props);
  }

  /**
   * オーナーかどうかを判定する
   *
   * @returns オーナーの場合true
   */
  isOwner(): boolean {
    return this.role.isOwner();
  }

  /**
   * 一般メンバーかどうかを判定する
   *
   * @returns メンバーの場合true
   */
  isMember(): boolean {
    return this.role.isMember();
  }
}
