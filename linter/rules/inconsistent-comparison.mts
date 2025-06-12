import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://your-rules/${name}`
);

function areTypesComparable(
  a: ts.Type,
  b: ts.Type,
  checker: ts.TypeChecker
): boolean {
  // Get all members of each type (treating non-unions as single-member unions)
  const membersA = a.isUnion() ? a.types : [a];
  const membersB = b.isUnion() ? b.types : [b];

  // Check if any combination is assignable in either direction
  return membersA.some((t1) =>
    membersB.some(
      (t2) =>
        checker.isTypeAssignableTo(t1, t2) || checker.isTypeAssignableTo(t2, t1)
    )
  );
}

export const inconsistentComparison = createRule({
  name: "inconsistent-comparison",
  meta: {
    type: "problem",
    docs: {
      description: "Disallow equality comparisons between incompatible types",
    },
    messages: {
      incompatibleTypes: "Inconsistent comparison: {{left}} vs {{right}}",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const parserServices = ESLintUtils.getParserServices(context);
    const checker = parserServices.program.getTypeChecker();

    return {
      "BinaryExpression[operator=/==|!=|===|!==/]": (
        node: TSESTree.BinaryExpression
      ) => {
        const leftTsNode = parserServices.esTreeNodeToTSNodeMap.get(node.left);
        const rightTsNode = parserServices.esTreeNodeToTSNodeMap.get(
          node.right
        );
        const leftType = checker.getTypeAtLocation(leftTsNode);
        const rightType = checker.getTypeAtLocation(rightTsNode);

        if (areTypesComparable(leftType, rightType, checker)) {
          return;
        }

        // Otherwise, flag as inconsistent
        context.report({
          node,
          messageId: "incompatibleTypes",
          data: {
            left: checker.typeToString(leftType),
            right: checker.typeToString(rightType),
          },
        });
      },
    };
  },
});
