/**
 * リングバッファでログを保持
 */
export class LogBuffer {
  private buffer: string[] = [];

  private maxLines: number;

  constructor(maxLines: number = 1000) {
    this.maxLines = maxLines;
  }

  /**
   * ログを追加
   */
  append(line: string): void {
    const lines = line.split("\n").filter((l) => l.length > 0);
    for (const l of lines) {
      this.buffer.push(l);
      if (this.buffer.length > this.maxLines) {
        this.buffer.shift();
      }
    }
  }

  /**
   * 最新N行を取得
   */
  getLines(count: number = 100): string[] {
    const start = Math.max(0, this.buffer.length - count);
    return this.buffer.slice(start);
  }

  /**
   * フィルタ付きでログを取得
   */
  getFilteredLines(
    filter: string,
    count: number = 100,
  ): string[] {
    const filtered = this.buffer.filter((line) =>
      line.toLowerCase().includes(filter.toLowerCase()),
    );
    const start = Math.max(0, filtered.length - count);
    return filtered.slice(start);
  }

  /**
   * ログをクリア
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * 全ログ数を取得
   */
  get length(): number {
    return this.buffer.length;
  }
}
