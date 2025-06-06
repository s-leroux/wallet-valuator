import { ESLintUtils, TSESTree } from "@typescript-eslint/utils";
import ts from "typescript";

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://your-rules/${name}`
);

function widenType(type: ts.Type, checker: ts.TypeChecker): ts.Type {
  if (type.isLiteral()) {
    return checker.getBaseTypeOfLiteralType(type);
  }
  return type;
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

        const typeA = widenType(checker.getTypeAtLocation(leftTsNode), checker);
        const typeB = widenType(
          checker.getTypeAtLocation(rightTsNode),
          checker
        );

        // Allow if either side is `any` or both are primitives of the same type
        if (
          typeA.flags & ts.TypeFlags.Any ||
          typeB.flags & ts.TypeFlags.Any ||
          checker.typeToString(typeA) === checker.typeToString(typeB)
        ) {
          return;
        }

        const leftIsObject = typeA.getFlags() & ts.TypeFlags.Object;
        const rightIsObject = typeB.getFlags() & ts.TypeFlags.Object;

        // Allow comparing structurally compatible objects (optional)
        if (
          leftIsObject &&
          rightIsObject &&
          checker.isTypeAssignableTo(typeA, typeB) &&
          checker.isTypeAssignableTo(typeB, typeA)
        ) {
          return;
        }

        // Otherwise, flag as inconsistent
        context.report({
          node,
          messageId: "incompatibleTypes",
          data: {
            left: checker.typeToString(typeA),
            right: checker.typeToString(typeB),
          },
        });
      },
    };
  },
});
