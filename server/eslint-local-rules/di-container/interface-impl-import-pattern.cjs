/**
 * Interface/Impl Import Pattern チェック
 *
 * di-container/ 内のファイルで:
 * - インターフェース（型）と実装クラス（Impl）の両方をimportする必要がある
 * - 型のみimportしてnewしようとするミスを防ぐ
 *
 * 対象パターン:
 * - UseCase / UseCaseImpl
 * - Repository / RepositoryImpl
 * - その他 Xxx / XxxImpl パターン
 *
 * 参照: guardrails/policy/server/di-container/10-di-container-overview.md
 */

"use strict";

/**
 * 対象となるサフィックスパターン
 * key: インターフェースのサフィックス
 * value: 除外するサフィックス（Input, Output等）
 */
const TARGET_PATTERNS = {
  UseCase: [
    "UseCaseInput",
    "UseCaseOutput",
    "UseCaseException",
    "UseCaseResult",
    "UseCaseProps",
  ],
  Repository: [],
};

/**
 * 名前がターゲットパターンにマッチするかチェック
 * @param {string} name
 * @returns {{ isInterface: boolean, isImpl: boolean, baseName: string, suffix: string } | null}
 */
const matchTargetPattern = (name) => {
  // Implで終わる場合
  if (name.endsWith("Impl")) {
    const withoutImpl = name.slice(0, -4); // "Impl" を除去
    for (const [suffix, excludes] of Object.entries(TARGET_PATTERNS)) {
      if (withoutImpl.endsWith(suffix)) {
        // 除外パターンのチェック
        const isExcluded = excludes.some((ex) => withoutImpl.endsWith(ex));
        if (!isExcluded) {
          return {
            isInterface: false,
            isImpl: true,
            baseName: withoutImpl,
            suffix,
          };
        }
      }
    }
    return null;
  }

  // インターフェース（型）の場合
  for (const [suffix, excludes] of Object.entries(TARGET_PATTERNS)) {
    if (name.endsWith(suffix)) {
      // 除外パターンのチェック
      const isExcluded = excludes.some((ex) => name.endsWith(ex));
      if (!isExcluded) {
        return {
          isInterface: true,
          isImpl: false,
          baseName: name,
          suffix,
        };
      }
    }
  }

  return null;
};

/**
 * import元がターゲットディレクトリかチェック
 * @param {string} source
 * @returns {boolean}
 */
const isTargetImportSource = (source) => {
  // use-case, repository, infrastructure からのimport
  return (
    source.includes("/use-case/") ||
    source.includes("@/use-case/") ||
    source.includes("/infrastructure/") ||
    source.includes("@/infrastructure/") ||
    source.includes("/domain/model/") ||
    source.includes("@/domain/model/")
  );
};

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Interface/Impl imports in di-container must include both type and Impl class",
      category: "DI Container",
      recommended: true,
    },
    schema: [],
    messages: {
      missingImplImport:
        "{{suffix}} type '{{typeName}}' is imported but '{{implName}}' is not. In di-container, you must import both type and Impl. See: di-container/10-di-container-overview.md",
      missingTypeImport:
        "{{suffix}} Impl '{{implName}}' is imported but type '{{typeName}}' is not imported with 'import type'. See: di-container/10-di-container-overview.md",
      typeImportShouldUseTypeKeyword:
        "{{suffix}} type '{{typeName}}' should be imported with 'import type' syntax. See: di-container/10-di-container-overview.md",
      newOnTypeNotImpl:
        "Cannot use 'new' on '{{typeName}}'. Use '{{implName}}' instead. '{{typeName}}' is a type alias, not a class. See: di-container/10-di-container-overview.md",
      bindImplMismatch:
        "bind<{{bindType}}> uses '{{newType}}' in toDynamicValue. Expected '{{expectedImpl}}'. See: di-container/10-di-container-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // di-container/ ディレクトリ内のファイルのみ
    if (!filename.includes("/di-container/")) {
      return {};
    }

    // service-id.ts, env-util.ts は除外
    if (
      filename.endsWith("service-id.ts") ||
      filename.endsWith("env-util.ts")
    ) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // import情報を収集
    // key: ベース名 (例: "CreateProjectUseCase", "TodoRepository")
    // value: { hasType, hasImpl, typeNode, implNode, isTypeOnlyImport, suffix }
    const imports = new Map();

    /**
     * ASTノードの祖先を辿って、bind().toDynamicValue()チェーンを見つける
     * ただし、toDynamicValueの直接のreturn値（ArrowFunctionの直接body、またはReturnStatement）のみ対象
     */
    const findBindChainForReturn = (node) => {
      let current = node;
      let isDirectReturn = false;

      while (current.parent) {
        const parent = current.parent;

        // ArrowFunctionExpressionのbody（直接return）
        if (
          parent.type === "ArrowFunctionExpression" &&
          parent.body === current
        ) {
          isDirectReturn = true;
          current = parent;
          continue;
        }

        // ReturnStatementのargument
        if (
          parent.type === "ReturnStatement" &&
          parent.argument === current
        ) {
          isDirectReturn = true;
          current = parent;
          continue;
        }

        // toDynamicValue の ArrowFunctionExpression または FunctionExpression
        if (
          (current.type === "ArrowFunctionExpression" ||
            current.type === "FunctionExpression") &&
          isDirectReturn
        ) {
          const callExpr = parent;
          if (
            callExpr?.type === "CallExpression" &&
            callExpr.callee?.property?.name === "toDynamicValue"
          ) {
            // toDynamicValue().の呼び出し元（bind()チェーン）を探す
            const memberExpr = callExpr.callee?.object;
            if (memberExpr?.type === "CallExpression") {
              // .bind<Type>() を探す
              let bindCall = memberExpr;
              while (bindCall) {
                if (
                  bindCall.callee?.property?.name === "bind" ||
                  (bindCall.callee?.type === "MemberExpression" &&
                    bindCall.callee?.property?.name === "bind")
                ) {
                  const typeArgs =
                    bindCall.typeArguments || bindCall.typeParameters;
                  if (typeArgs && typeArgs.params.length > 0) {
                    const bindTypeName = typeArgs.params[0].typeName?.name;
                    if (bindTypeName) {
                      return { bindType: bindTypeName, bindNode: bindCall };
                    }
                  }
                }
                // チェーンを遡る
                bindCall = bindCall.callee?.object;
              }
            }
          }
          return null;
        }

        current = parent;
      }
      return null;
    };

    return {
      ImportDeclaration(node) {
        const source = node.source?.value || "";

        if (!isTargetImportSource(source)) {
          return;
        }

        const isTypeOnlyImport = node.importKind === "type";

        for (const specifier of node.specifiers || []) {
          if (specifier.type !== "ImportSpecifier") continue;

          const importedName = specifier.imported?.name;
          if (!importedName) continue;

          const match = matchTargetPattern(importedName);
          if (!match) continue;

          const existing = imports.get(match.baseName) || {
            hasType: false,
            hasImpl: false,
            typeNode: null,
            implNode: null,
            isTypeOnlyImport: false,
            suffix: match.suffix,
          };

          if (match.isImpl) {
            existing.hasImpl = true;
            existing.implNode = specifier;
          } else {
            existing.hasType = true;
            existing.typeNode = specifier;
            existing.isTypeOnlyImport =
              isTypeOnlyImport || specifier.importKind === "type";
          }

          imports.set(match.baseName, existing);
        }
      },

      // new SomeUseCase() / new SomeRepository() のパターンをチェック
      NewExpression(node) {
        const calleeName = node.callee?.name;
        if (!calleeName) return;

        const match = matchTargetPattern(calleeName);
        if (!match) return;

        // 型（Implでない）をnewしようとしている
        if (match.isInterface) {
          const implName = calleeName + "Impl";
          context.report({
            node,
            messageId: "newOnTypeNotImpl",
            data: { typeName: calleeName, implName },
          });
          return;
        }

        // Implの場合、bind<Type>との整合性をチェック（returnされる値のみ）
        if (match.isImpl) {
          const bindInfo = findBindChainForReturn(node);
          if (bindInfo) {
            const expectedImpl = bindInfo.bindType + "Impl";
            if (calleeName !== expectedImpl) {
              context.report({
                node,
                messageId: "bindImplMismatch",
                data: {
                  bindType: bindInfo.bindType,
                  newType: calleeName,
                  expectedImpl,
                },
              });
            }
          }
        }
      },

      "Program:exit"() {
        // 各インターフェースについて、型とImplの両方がimportされているかチェック
        for (const [baseName, info] of imports) {
          const implName = baseName + "Impl";

          if (info.hasType && !info.hasImpl) {
            context.report({
              node: info.typeNode,
              messageId: "missingImplImport",
              data: { typeName: baseName, implName, suffix: info.suffix },
            });
          }

          if (info.hasImpl && !info.hasType) {
            context.report({
              node: info.implNode,
              messageId: "missingTypeImport",
              data: { implName, typeName: baseName, suffix: info.suffix },
            });
          }

          if (info.hasType && !info.isTypeOnlyImport) {
            context.report({
              node: info.typeNode,
              messageId: "typeImportShouldUseTypeKeyword",
              data: { typeName: baseName, suffix: info.suffix },
            });
          }
        }
      },
    };
  },
};
