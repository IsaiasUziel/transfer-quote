# Transfer Quote

A business-neutral travel quote calculator for visits, deliveries, field services, and other round trips. Configure a base and rates, choose a destination, and save a quote with an optional name.

The interface is in Spanish. This release uses kilometers, Chilean pesos (CLP), and `es-CL` formatting. Chile is the default search country; the deployment name, geographic defaults, and service endpoints are configurable.

## Run locally

Use Bun and a Node.js version supported by Vite 8 (20.19+ or 22.12+).

```sh
bun install --frozen-lockfile
bun run dev
```

Open the URL printed by Vite. In **Ajustes**, set your base, optional map pin, and rates. In **Cotizar**, enter a destination or coordinates and the number of visits.

To customize deployment defaults, copy `.env.example` to `.env.local`, edit the public values, and restart Vite. See the [deployment guide](docs/deployment.md).

## Features

- Address suggestions, decimal or degrees/minutes/seconds coordinate input, and an adjustable map pin.
- Automatic one-way driving distance through a configured OSRM-compatible endpoint, with manual distance entry as a fallback.
- Round-trip visits, configurable included kilometers, separate outbound and return rates, and a minimum fare.
- Optional quote names, local history, and version-1 JSON backup/restore.
- System, light, and dark appearance modes with a saved preference.

History is stored in the current browser, not on a server. There are no accounts, payments, or cross-device synchronization. Address searches, map tiles, and routing send requests to the configured external services; their operators may log those requests. Reverse address lookup is opt-in.

Vercel Web Analytics collects page views when enabled on the deployed Vercel project. The app does not send quote contents, addresses, or saved history as custom analytics events. Local development uses the SDK's development mode.

## How pricing works

Each visit includes one outbound leg and one return leg. Both use the entered or calculated one-way distance, rounded to one decimal place.

```text
outboundKm        = visits × oneWayKm
returnKm          = visits × oneWayKm
totalApproxKm     = outboundKm + returnKm
billableOutbound  = max(0, outboundKm - includedKm)
outboundCharge    = billableOutbound × outboundRate
returnCharge      = returnKm × returnRate
total             = max(minimumFare, round(outboundCharge + returnCharge))
```

Included kilometers are deducted once per quote, from outbound distance only. They do not reduce physical distance or the return charge. The estimate assumes symmetric outbound and return distances; it does not calculate a separate reverse-direction route.

Example defaults: 10 km one way, 2 visits, 2 included km, CLP 400 per outbound km, CLP 200 per return km, and a CLP 400 minimum produce 40 km of travel and a CLP 11,200 quote. These are editable starting values, not business-specific pricing recommendations.

## Build and verify

```sh
bun run test:run
bun run typecheck
bun run lint
bun run build
bun run preview
```

The production build is in `dist/` and can be served at a domain root or under a subdirectory. Follow the [deployment guide](docs/deployment.md) before choosing public map and routing services; demo services have usage limits and no availability guarantee.

## Project reference

- [Contributing](CONTRIBUTING.md)
- [Domain glossary](GLOSSARY.md)
- [Architecture and data compatibility](docs/architecture.md)
- [Deployment and provider policies](docs/deployment.md)

Built with React, TypeScript, Vite, Tailwind CSS, Leaflet, Zod, and IndexedDB. Bun manages dependencies; Vitest runs tests; `tsrs` performs type checking.

## License

The project's original code is licensed under [MIT](LICENSE). Third-party runtime licenses are preserved in [THIRD_PARTY_LICENSES.txt](public/THIRD_PARTY_LICENSES.txt), which is also copied into `dist/`. Map data and external services retain their own licenses and usage policies.
