# Contributing to this project

Thank you for considering contributing to this project! By following these guidelines, you help us maintain a consistent codebase and ensure a smooth development process for everyone involved.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Code of Conduct](#code-of-conduct)
- [Submitting Changes](#submitting-changes)
- [Coding Style](#coding-style)
- [Testing](#testing)

---

## Getting Started

To be defined

---

## Code of Conduct

To be defined.

---

## Submitting Changes

1. Create a new branch for your feature or bug fix.
2. Ensure your code adheres to the [Coding Style](#coding-style) guidelines.
3. Write tests for your changes and ensure all existing tests pass.
4. Submit a pull request (PR) with a clear description of the problem and solution.

---

## Coding Style

Source code should be processed by Prettier to ensure consistent formatting across the codebase.

Consistency is key to maintaining a readable and maintainable codebase. Please follow these guidelines:

### General Guidelines

- Use TypeScript's `strict` mode.
- Use `const` for variables that won't be reassigned and `let` otherwise. Avoid using `var`.
- Use `arrow functions` (`=>`) unless a traditional `function` is explicitly required (e.g., for `this` binding).
- Use `===` and `!==` for comparisons.

### `null` vs `undefined`

- Use `null` to explicitly indicate the intentional absence of a value. For example, the end of a linked list:

  ```typescript
  class Node<T> {
    value: T;
    next: Node<T> | null; // Use `null` to signify the end of the list.

    constructor(value: T, next: Node<T> | null = null) {
      this.value = value;
      this.next = next;
    }
  }
  ```

- Use `undefined` for uninitialized or optional values. This is consistent with TypeScript's handling of optional properties or parameters:

  ```typescript
  function greet(name?: string): string {
    return name ? `Hello, ${name}!` : "Hello!";
  }
  ```

**Key Distinction**:

- Use `null` when the absence of a value is **explicit and meaningful**.
- Use `undefined` when a value is **optional, uninitialized, or omitted**.

**Example:**

```typescript
const list: Node<number> | null = new Node(1); // `null` signifies the end of the list.

let someValue: string | undefined; // `undefined` indicates the variable is not yet initialized.
```

### Additional TypeScript Guidelines

- Prefer `readonly` for properties that should not change after initialization.
- Use `strictNullChecks` and avoid the `any` type unless absolutely necessary.

---

## Testing

All compilation and testing should be done within the Docker container defined by the `Dockerfile` at the root of the project. To set up and use the container, ensure you follow the instructions in the project's README.

All new features and fixes must include test coverage. Follow these steps for testing:

1. Write unit tests using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/).assert.
2. Run tests locally to verify:
   ```bash
   npm test
   ```

Thank you for contributing to this project! Your efforts help make it better for everyone.

