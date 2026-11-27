# Money Management maintenance

## Delivery preference

The repository owner explicitly authorized on 2026-11-27 that requested changes
to this project should be implemented, appropriately checked, committed, pushed
to this GitHub repository, and deployed through its existing GitHub Pages
workflow. Do not ask again for permission to publish routine requested updates.
Preserve concurrent work and inspect a changed remote head before updating it.

The canonical application is https://thanhlampro1012.github.io/money-management/.
Verify the Pages workflow and the public application before reporting a release
as live. Report blockers accurately if deployment or authentication fails.

## Data and compatibility

- Never commit real personal financial data, backups, credentials, or logs that
  contain them. Use synthetic data only for isolated verification.
- Preserve the existing `vi-minh:v1` ledger and validated import compatibility.
- Do not replace user data on startup or during a service-worker upgrade.
- Browser-local storage and recovery history are not cloud synchronization.
  File backup UI must distinguish initiating a download from completing a write.
- Increment the service-worker cache VERSION for every release that modifies
  precached runtime assets. Keep its cache confined to this project scope.
- Validate meaningful changed behavior with `npm run check`, `npm test`, and
  targeted browser checks. Do not claim physical phone testing without doing it.

## Project layout

`dist/` is the deployable, dependency-free browser application. `tests/` holds
Node tests; `scripts/serve.mjs` serves local previews. The icon generator is only
a development utility; its Python dependency is not needed to run the website.
