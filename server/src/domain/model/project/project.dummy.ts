import { Project } from "./project";
import { ProjectColor } from "./project-color";
import {
  getDummyId,
  getDummyShortText,
  getDummyDescription,
  getDummyRecentDate,
  getDummyProjectColor,
} from "@/util/testing-util/dummy-data";

export type ProjectDummyProps = Partial<{
  id: string;
  name: string;
  description?: string;
  color: ProjectColor;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のダミープロジェクトを生成する
 *
 * @example projectDummyFrom()
 * @example projectDummyFrom({ name: "カスタムプロジェクト" })
 * @example projectDummyFrom({ description: "プロジェクトの説明" })
 */
export const projectDummyFrom = (props?: ProjectDummyProps): Project => {
  const now = getDummyRecentDate();

  // デフォルトのランダムカラーを生成
  const getDefaultColor = (): ProjectColor => {
    const colorResult = ProjectColor.fromString(getDummyProjectColor());
    if (!colorResult.success) {
      throw colorResult.error;
    }
    return colorResult.data;
  };

  return new Project({
    id: props?.id ?? getDummyId(),
    name: props?.name ?? getDummyShortText(),
    description: props?.description ?? getDummyDescription(),
    color: props?.color ?? getDefaultColor(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
