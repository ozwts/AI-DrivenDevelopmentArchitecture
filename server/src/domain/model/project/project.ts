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
   * コンストラクタ
   *
   * @param props - プロジェクトのプロパティ
   */
  constructor(props: ProjectProps) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.color = props.color;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * プロジェクト名を変更して新しいProjectインスタンスを返す
   *
   * @param name - 新しいプロジェクト名
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  changeName(name: string, updatedAt: string): Project {
    return new Project({
      ...this,
      name,
      updatedAt,
    });
  }

  /**
   * プロジェクト説明を変更して新しいProjectインスタンスを返す
   *
   * @param description - 新しいプロジェクト説明
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  changeDescription(description: string | undefined, updatedAt: string): Project {
    return new Project({
      ...this,
      description,
      updatedAt,
    });
  }

  /**
   * プロジェクトカラーを変更して新しいProjectインスタンスを返す
   *
   * @param color - 新しいプロジェクトカラー（16進数カラーコード #RRGGBB形式）
   * @param updatedAt - 更新日時
   * @returns 更新された新しいProjectインスタンス
   */
  changeColor(color: string, updatedAt: string): Project {
    return new Project({
      ...this,
      color,
      updatedAt,
    });
  }
}
