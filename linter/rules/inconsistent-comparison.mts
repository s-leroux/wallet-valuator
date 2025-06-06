import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://your-rules/${name}`
);

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

        // Allow if either side is `any` or both are primitives of the same type
        if (
          leftType.flags & ts.TypeFlags.Any ||
          rightType.flags & ts.TypeFlags.Any ||
          checker.typeToString(leftType) === checker.typeToString(rightType)
        ) {
          return;
        }

        const leftIsObject = leftType.getFlags() & ts.TypeFlags.Object;
        const rightIsObject = rightType.getFlags() & ts.TypeFlags.Object;

        // Allow comparing structurally compatible objects (optional)
        if (
          leftIsObject &&
          rightIsObject &&
          checker.isTypeAssignableTo(leftType, rightType) &&
          checker.isTypeAssignableTo(rightType, leftType)
        ) {
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
