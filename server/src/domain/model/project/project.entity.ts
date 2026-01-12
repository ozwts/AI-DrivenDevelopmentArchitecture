import type { ProjectMember } from "./project-member.entity";

/**
 * Project コンストラクタのProps型
 */
export type ProjectProps = {
  id: string;
  name: string;
  description: string | undefined;
  color: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
};

/**
 * プロジェクトエンティティ
 *
 * TODOをグループ化して管理するためのプロジェクトを表すドメインエンティティ。
 * プロジェクトは名前、説明、カラーコードを持ち、複数のTODOと関連付けられる。
 *
 * @example
 * ```typescript
 * // プロジェクトの作成
 * const project = new Project({
 *   id: "project-123",
 *   name: "新規プロジェクト",
 *   description: "プロジェクトの説明",
 *   color: "#FF5733",
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // プロジェクト名の変更（新しいインスタンスを生成）
 * const updated = project.changeName("更新されたプロジェクト", "2024-01-02T00:00:00.000Z");
 * ```
 */
export class Project {
  /**
   * プロジェクトID
   *
   * プロジェクトを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * プロジェクト名
   *
   * プロジェクトの表示名。
   * 必須項目。
   */
  readonly name: string;

  /**
   * プロジェクト説明
   *
   * プロジェクトの詳細説明。
   * Tier 3（Optional）項目。
   */
  readonly description: string | undefined;

  /**
   * プロジェクトカラー
   *
   * プロジェクトを視覚的に識別するためのカラーコード。
   * 16進数カラーコード（#RRGGBB形式）。
   * OpenAPIで pattern: "^#[0-9A-Fa-f]{6}$" により形式が保証される。
   */
  readonly color: string;

  /**
   * 作成日時
   *
   * プロジェクトが作成された日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly createdAt: string;

  /**
   * 更新日時
   *
   * プロジェクトが最後に更新された日時（ISO 8601形式）。
   * プロジェクト情報が更新されるたびに更新される。
   */
  readonly updatedAt: string;

  /**
   * プロジェクトメンバー
   *
   * このプロジェクトに参加しているメンバーのリスト。
   * Projectアグリゲートの一部として管理される。
   */
  readonly members: ProjectMember[];

  private constructor(props: ProjectProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.color = props.color;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.members = props.members;
  }

  /**
   * Projectインスタンスを生成する
   *
   * @param props - プロジェクトのプロパティ
   * @returns Projectインスタンス
   */
  static from(props: ProjectProps): Project {
    return new Project(props);
  }

  /**
   * プロジェクト名を変更する
   *
   * @param name - 新しいプロジェクト名
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  rename(name: string, updatedAt: string): Project {
    return new Project({
      ...this,
      name,
      updatedAt,
    });
  }

  /**
   * プロジェクトの説明を明確化する
   *
   * @param description - 新しいプロジェクト説明
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  clarify(description: string | undefined, updatedAt: string): Project {
    return new Project({
      ...this,
      description,
      updatedAt,
    });
  }

  /**
   * プロジェクトのカラーを再設定する
   *
   * @param color - 新しいプロジェクトカラー（16進数カラーコード #RRGGBB形式）
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  recolor(color: string, updatedAt: string): Project {
    return new Project({
      ...this,
      color,
      updatedAt,
    });
  }

  /**
   * メンバーを追加する
   *
   * @param member - 追加するメンバー
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいProjectインスタンス
   */
  addMember(member: ProjectMember, updatedAt: string): Project {
    return new Project({
      ...this,
      members: [...this.members, member],
      updatedAt,
    });
  }

  /**
   * メンバーを削除する
   *
   * @param memberId - 削除するメンバーのID
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいProjectインスタンス
   */
  removeMember(memberId: string, updatedAt: string): Project {
    return new Project({
      ...this,
      members: this.members.filter((m) => m.id !== memberId),
      updatedAt,
    });
  }

  /**
   * メンバーを更新する
   *
   * @param updatedMember - 更新するメンバー
   * @param updatedAt - 更新日時（ISO 8601形式）
   * @returns 新しいProjectインスタンス
   */
  replaceMember(updatedMember: ProjectMember, updatedAt: string): Project {
    return new Project({
      ...this,
      members: this.members.map((m) =>
        m.id === updatedMember.id ? updatedMember : m,
      ),
      updatedAt,
    });
  }

  /**
   * オーナーを取得する
   *
   * @returns オーナーのProjectMember、見つからない場合はundefined
   */
  findOwner(): ProjectMember | undefined {
    return this.members.find((m) => m.isOwner());
  }

  /**
   * ユーザーIDでメンバーを検索する
   *
   * @param userId - 検索するユーザーID
   * @returns 見つかったProjectMember、見つからない場合はundefined
   */
  findMemberByUserId(userId: string): ProjectMember | undefined {
    return this.members.find((m) => m.userId === userId);
  }

  /**
   * 指定したユーザーがメンバーかどうかを判定する
   *
   * @param userId - 判定するユーザーID
   * @returns メンバーの場合true
   */
  hasMember(userId: string): boolean {
    return this.members.some((m) => m.userId === userId);
  }
}
