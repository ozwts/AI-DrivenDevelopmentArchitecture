/**
 * Leaf/CompositeコンポーネントでHTML属性型使用時のclassName除外強制ルール
 *
 * lib/ui/leaf/ および lib/ui/composite/ 内のコンポーネントは
 * HTML属性型（ButtonHTMLAttributes, ComponentPropsWithoutRef等）を使用する場合、
 * 必ず Omit<..., "className"> でclassNameを除外しなければならない。
 *
 * NG: ButtonHTMLAttributes<HTMLButtonElement>
 * NG: ComponentPropsWithoutRef<"button">
 * OK: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">
 * OK: Omit<ComponentPropsWithoutRef<"button">, "className">
 *
 * 参照: guardrails/policy/web/ui/10-ui-overview.md
 */

"use strict";

/**
 * HTML属性型のパターン
 * これらの型はclassNameプロパティを含むため、Omitが必要
 */
const HTML_ATTRIBUTE_PATTERNS = [
  /HTMLAttributes$/,
  /^ComponentPropsWithoutRef$/,
  /^ComponentProps$/,
  /^ComponentPropsWithRef$/,
];

/**
 * 型名がHTML属性型かどうかを判定
 */
function isHtmlAttributeType(typeName) {
  return HTML_ATTRIBUTE_PATTERNS.some((pattern) => pattern.test(typeName));
}

/**
 * Omitの第2引数に"className"が含まれているかをチェック
 */
function hasClassNameInOmitKeys(omitSecondArg) {
  if (!omitSecondArg) return false;

  // 単一リテラル: Omit<..., "className">
  if (omitSecondArg.type === "TSLiteralType") {
    return omitSecondArg.literal?.value === "className";
  }

  // Union型: Omit<..., "className" | "style">
  if (omitSecondArg.type === "TSUnionType") {
    return omitSecondArg.types.some(
      (t) => t.type === "TSLiteralType" && t.literal?.value === "className"
    );
  }

  return false;
}

/**
 * TSTypeReferenceがOmitでラップされた形式かをチェック
 * Omit<HTMLAttributeType, "className">
 */
function isOmitWithClassName(node) {
  if (node.type !== "TSTypeReference") return false;

  const typeName = node.typeName?.name;
  if (typeName !== "Omit") return false;

  const params = node.typeArguments?.params;
  if (!params || params.length < 2) return false;

  // 第1引数がHTML属性型
  const firstParam = params[0];
  if (firstParam.type !== "TSTypeReference") return false;

  const innerTypeName = firstParam.typeName?.name;
  if (!isHtmlAttributeType(innerTypeName)) return false;

  // 第2引数に"className"が含まれている
  return hasClassNameInOmitKeys(params[1]);
}

/**
 * TSTypeReferenceがHTML属性型かどうかをチェック
 */
function isRawHtmlAttributeType(node) {
  if (node.type !== "TSTypeReference") return false;

  const typeName = node.typeName?.name;
  return isHtmlAttributeType(typeName);
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require Omit<..., 'className'> when using HTML attribute types in Leaf/Composite UI components",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      missingOmitClassName:
        '{{category}} component must use Omit<{{typeName}}, "className"> to exclude className. See: ui/{{policyFile}}',
    },
  },

  create(context) {
    const filename = context.getFilename();

    // lib/ui/leaf/ または lib/ui/composite/ 内のファイルのみ対象
    const isLeaf = filename.includes("/lib/ui/leaf/");
    const isComposite = filename.includes("/lib/ui/composite/");

    if (!isLeaf && !isComposite) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    const category = isLeaf ? "Leaf" : "Composite";
    const policyFile = isLeaf ? "20-leaf.md" : "40-composite.md";

    /**
     * 型ノードを再帰的にチェックし、Omitなしで使われているHTML属性型を検出
     */
    function checkTypeNode(node) {
      if (!node) return;

      // TSTypeReference: 型参照
      if (node.type === "TSTypeReference") {
        // Omit<HTMLAttributes, "className"> はOK
        if (isOmitWithClassName(node)) {
          return;
        }

        // 生のHTML属性型はNG
        if (isRawHtmlAttributeType(node)) {
          const typeName = node.typeName?.name;
          context.report({
            node,
            messageId: "missingOmitClassName",
            data: { category, typeName, policyFile },
          });
          return;
        }

        // その他のジェネリック型（Pick, Partial等）の中身もチェック
        if (node.typeArguments?.params) {
          for (const param of node.typeArguments.params) {
            checkTypeNode(param);
          }
        }
      }

      // Intersection型: A & B
      if (node.type === "TSIntersectionType") {
        for (const t of node.types) {
          checkTypeNode(t);
        }
      }

      // Union型: A | B
      if (node.type === "TSUnionType") {
        for (const t of node.types) {
          checkTypeNode(t);
        }
      }
    }

    return {
      // Props型エイリアスをチェック
      TSTypeAliasDeclaration(node) {
        const typeName = node.id?.name;
        // *Props で終わる型のみ対象
        if (!typeName?.endsWith("Props")) {
          return;
        }

        checkTypeNode(node.typeAnnotation);
      },
    };
  },
};
