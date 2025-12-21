/**
 * ルート設計用ESLintルール
 *
 * ルート設計に適用されるルール
 *
 * MECE構成:
 * - require-outlet-context-type: useOutletContext()の型パラメータ必須
 * - outlet-requires-context: <Outlet>のcontext prop必須
 * - require-snapshot-test: route.tsxにroute.ss.test.tsが必須
 *
 * 参照: guardrails/policy/web/route/
 */

"use strict";

module.exports = {
  "require-outlet-context-type": require("./require-outlet-context-type.cjs"),
  "outlet-requires-context": require("./outlet-requires-context.cjs"),
  "require-snapshot-test": require("./require-snapshot-test.cjs"),
};
