# Contributing to this project

Thank you for considering contributing to this project! By following these guidelines, you help us maintain a consistent codebase and ensure a smooth development process for everyone involved.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Vocabulary](#vocabulary)
- [Code of Conduct](#code-of-conduct)
- [Submitting Changes](#submitting-changes)
- [Coding Style](#coding-style)
- [Testing](#testing)

---

## Getting Started

To be defined

---

## Vocabulary

Throughout the project, I have tried to be consistent with the following definitions, especially regarding naming files, classes, variables, and other code artifacts.

- **crypto** (or better **crypto-asset**): a generic term for coins, cryptocurrencies, rwa, tokens, or similar, stored on-chain.
- **fiat** (or better **fiat-currency**): a generic term for government-issued currency. Fiat currencies are identified by *ISO 4217 currency codes*, a 3-letter code usually made from the country and currency initial: USD, GBP, JPY. A notable exception is EUR for euros.

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

### Coding Style: Mixed Property Declarations

In certain classes, it may be necessary to use both **explicit property declarations** and **implicit property declarations through constructor parameters**. This pattern can improve readability and align with the separation of responsibilities within a class.

#### When to Use Mixed Styles
- Use **implicit declarations** for **dependencies** that are injected into the class, such as services, utilities, or helpers. These parameters should be concise and require minimal initialization logic.
- Use **explicit declarations** for **data properties** that represent the class's core state or require complex initialization, transformation, or validation logic.

#### Benefits
- **Clarity**: Clearly distinguishes between injected dependencies and the core state of the class.
- **Responsibility Separation**: Aligns with dependency injection patterns while maintaining flexibility for state initialization.
- **Reduced Boilerplate**: Keeps constructors concise for dependency injection.

#### Example

```typescript
class UserService {
  constructor(
    private readonly apiClient: ApiClient, // Dependency Injection
    private readonly logger: Logger // Dependency Injection
  ) {}

  // Explicitly declared data properties
  public username: string;
  private age: number;

  constructor(
    apiClient: ApiClient,
    logger: Logger,
    username: string,
    age: number
  ) {
    this.apiClient = apiClient;
    this.logger = logger;

    // Explicitly initialize data properties
    this.username = username.trim();
    this.age = Math.max(0, age); // Example of complex initialization logic
  }

  // Example method
  getUserProfile(): Promise<UserProfile> {
    this.logger.log(`Fetching profile for ${this.username}`);
    return this.apiClient.fetchUserProfile(this.username);
  }
}
```

#### Guidelines
- Keep **implicit declarations** concise and limited to injected dependencies.
- Use **explicit declarations** for properties that require additional processing or are integral to the class's state.
- Avoid mixing styles in small or simple classes where one style is sufficient.

### Additional TypeScript Guidelines

- Prefer `readonly` for properties that should not change after initialization.
- Use `strictNullChecks` and avoid the `any` type unless absolutely necessary.

### Null-Prototype Objects for Record<K, V>

When returning a `Record<K, V>`, prefer using **null-prototype objects** (`Object.create(null)`) over plain objects (`{}`). This prevents unintended prototype pollution and avoids accidental property lookups on `Object.prototype`.

**Example:**
```ts
// Preferred:
const myRecord: Record<string, number> = Object.create(null);
myRecord["key"] = 42;

// Avoid:
const myRecord: Record<string, number> = {};
myRecord["key"] = 42; // Potential risk of prototype interference
```

This practice ensures that lookups in the record only access explicitly assigned properties and do not inherit from `Object.prototype` (e.g., avoiding `toString` or `hasOwnProperty` being accidentally overridden).

---

## Testing

All compilation and testing should be done within the Docker container defined by the `Dockerfile` at the root of the project. To set up and use the container, ensure you follow the instructions in the project's README.

All new features and fixes must include test coverage. Follow these steps for testing:

1. Write unit tests using [Mocha](https://mochajs.org/) and [Chai](https://www.chaijs.com/).assert.
2. Run tests inside the container to verify:
   ```bash
   yarn test-in-container
   ```

Thank you for contributing to this project! Your efforts help make it better for everyone.


