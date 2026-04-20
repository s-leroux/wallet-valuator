# Data (`src/data`)

This folder holds **well-known, hard-coded** configuration and registries for the library: chain metadata, built-in crypto asset definitions, and similar static data. Treat it as the project’s **embedded database** for now—structured, versioned, and loaded at build or runtime—rather than as ad hoc constants scattered through the codebase.

Type safety at the **data** boundary matters: consumers should rely on typed shapes (for example `satisfies` on imported JSON, or typed `const` modules), not untyped blobs.

## Roadmap: TypeScript first, SQLite later

A practical sequence is to **normalize the schema and source representation in TypeScript** as a near-term step when mixing JSON and `.mts` feels inconsistent. That gives one authoring style, strong checking in the editor, and a single compile path. Later, you can **replace static loading with SQLite** when you are ready; the TypeScript (or generated JSON) from this folder can serve as **seed data** for the first migration. That avoids a single huge change while still moving toward one storage story.

- **Short-term:** consolidate static data into TypeScript where it helps consistency and typing.
- **Longer-term:** SQLite (or similar) if you want a real database—one access pattern, migrations, and room to grow—while TypeScript-first work stays a valid bridge, not a dead end.

## Files

| File                        | Role                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| `blockchains.json`          | Registry of known blockchains / ledger labels and metadata used by `Blockchain` and related code.        |
| `wellknowncryptoassets.mts` | Built-in crypto asset tuples (id, display names, decimals, metadata) used by the registry and resolvers. |
