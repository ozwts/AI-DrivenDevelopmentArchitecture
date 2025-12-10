/**
 * ランダムなHEXカラーを生成
 */
export const getRandomColor = (): string => {
  const randomHex = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");
  return `#${randomHex}`;
};

/**
 * 複数のランダムカラーを生成
 */
export const generateColorPalette = (count: number): string[] => {
  return Array.from({ length: count }, () => getRandomColor());
};
