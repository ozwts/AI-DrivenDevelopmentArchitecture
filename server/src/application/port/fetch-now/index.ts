/**
 * 現在時刻を返す関数型インターフェース
 *
 * @description
 * テスト時に時刻を固定できるよう抽象化する。
 * 本番ではnew Date()を返す実装を、テストではDummy実装を注入する。
 *
 * @returns 現在のDateオブジェクト
 */
export type FetchNow = () => Date;
