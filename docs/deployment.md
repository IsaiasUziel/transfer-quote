# Deploy the static app

Build the app with Bun and serve `dist/` over HTTPS. The repository does not deploy automatically or require an application backend. Map, search, and routing providers must allow browser requests from your deployment origin.

## Build settings

| Setting | Value |
| --- | --- |
| Install | `bun install --frozen-lockfile` |
| Build | `bun run build` |
| Output directory | `dist` |
| Runtime | Static files; no server-side environment variables |

Vite uses a relative base (`./`), so the same build supports a domain root or a repository subpath. Keep the complete `dist/` directory together, including the favicon and third-party notices. There is no URL router requiring a history fallback. See [Vite static deployment](https://vite.dev/guide/static-deploy.html).

Set build-time variables in your hosting platform or in `.env.local` before building. Rebuild after changing them. Every `VITE_*` value is public in the JavaScript bundle; do not place private credentials in these variables. See [Vite environment variables](https://vite.dev/guide/env-and-mode.html).

## Public configuration

Defaults are defined in `src/config/app.ts`. `.env.example` contains a complete editable example.

| Variable | Purpose |
| --- | --- |
| `VITE_APP_NAME` | Header and browser title; defaults to “Cotizador de traslados” |
| `VITE_GEOCODING_COUNTRY` | Two-letter search country; `CL` by default, empty for worldwide search |
| `VITE_MAP_LATITUDE`, `VITE_MAP_LONGITUDE` | Initial map center; defaults to central Santiago |
| `VITE_PHOTON_URL` | Photon-compatible search endpoint; empty disables suggestions |
| `VITE_REVERSE_GEOCODING_URL` | Optional Nominatim-compatible reverse endpoint; disabled by default |
| `VITE_OSRM_URL` | OSRM-compatible route base URL ending in `/route/v1/driving`; empty disables automatic routing |
| `VITE_TILE_URL` | Raster tile template using `{z}`, `{x}`, and `{y}` |
| `VITE_TILE_ATTRIBUTION` | Trusted attribution HTML required by your tile provider |

The configured base pin overrides the deployment center for destination searches and the destination map. Currency and number formatting remain CLP and `es-CL`; changing the search country does not change currency.

When reverse lookup is disabled or fails, a manually selected point retains its coordinates and a usable coordinate label. Pasting coordinates does not require address lookup. Disabling routing leaves manual distance entry available.

## Choose services for the expected traffic

Bundled defaults use public demo services for search/routing and OpenStreetMap tiles. They support limited evaluation, not unrestricted capacity. Configure services you operate or a provider whose terms match the expected public usage.

- **Photon:** reasonable usage is permitted, while extensive use can be throttled or blocked. Availability is not guaranteed. See the [Photon demo policy](https://github.com/komoot/photon#demo-server).
- **OSRM:** the current operator limits use to one request per second, disallows heavy use, and requires attribution and a map-correction link. For a public deployment, enforce aggregate limits through a suitable proxy or use your own service. See the [current routing policy](https://routing.openstreetmap.de/about.html).
- **OpenStreetMap tiles:** keep attribution, valid browser referrers, normal HTTP caching, and no bulk downloads or prefetch. Use the documented HTTPS tile URL or an alternative provider. See the [tile policy](https://operations.osmfoundation.org/policies/tiles/).
- **Reverse lookup:** opt in after selecting a Nominatim-compatible service or proxy. Public Nominatim requires an informed operator decision, identification, attribution, caching, and at most one request per second across the whole application. It forbids autocomplete. A per-browser limiter cannot enforce an application-wide quota; a proxy can limit traffic, cache responses, and change upstream without rebuilding. See the [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/).

Autocomplete uses Photon, never Nominatim. Keep provider credits and map attribution visible. The application MIT license does not license map data or grant capacity on third-party servers.

## Verify the deployed origin

On Vercel, enable **Web Analytics** in the project's **Analytics** tab, then deploy the app. The React integration is mounted once in `src/main.tsx` and records page views without custom quote events. See [Vercel Web Analytics setup](https://vercel.com/docs/analytics/quickstart). For other hosts, remove the `Analytics` component and import unless the host provides compatible analytics endpoints.

After uploading `dist/`, verify first-run setup, suggestions or coordinate input, pin adjustment, route/manual distance, save/history, JSON export/import, and appearance on desktop and mobile. Check a fresh browser and any configured subpath.

Browser data belongs to the deployment origin. Moving domains or ports does not move IndexedDB or localStorage. Export history before moving and import it at the new origin; base/rate/appearance settings must be configured there separately.
