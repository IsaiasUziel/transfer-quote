# Contributing

Use Bun and the committed lockfile. Keep changes focused on a working travel-quote flow and include the checks that demonstrate the behavior.

## Start locally

```sh
bun install --frozen-lockfile
bun run dev
```

Deployment defaults are optional; copy `.env.example` to `.env.local` to customize them. See the [deployment guide](docs/deployment.md).

## Verify a change

```sh
bun run test:run
bun run typecheck
bun run lint
bun run build
```

For a reproducible bug, add a focused failing test before fixing it. For UI changes, check keyboard access, narrow screens, both color themes, and the affected flow in a browser. Report checks you could not run.

## Preserve the contracts

- Keep pricing independent of React, maps, and storage.
- Preserve existing browser data and version-1 JSON imports. Saved quotes retain their original pricing snapshot.
- Use business-neutral wording and the terms in the [glossary](GLOSSARY.md).
- Keep code and documentation in English; extend the existing Spanish UI copy in neutral Spanish.
- Use fictional sample data in issues, fixtures, and screenshots. Do not include customer exports, credentials, or local environment files.
- Preserve map attribution and third-party license notices when changing providers or dependencies.

This project's original code is MIT-licensed. Third-party dependencies and map services retain their own terms.
