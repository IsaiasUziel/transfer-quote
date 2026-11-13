# Travel Quote Architecture

The app separates a deterministic pricing function from its UI and browser/service adapters. There is no backend, account system, payment integration, or cross-device sync.

## Boundaries

| Area | Responsibility |
| --- | --- |
| `src/domain/` | Quote values and pure pricing arithmetic |
| `src/features/` | Quote form, history, settings, and appearance |
| `src/components/` | Address suggestions, coordinate input, and the Leaflet map |
| `src/infrastructure/` | Geocoding, routing, IndexedDB, JSON import/export |
| `src/config/app.ts` | Public deployment defaults |

The map uses Leaflet directly. Mounting creates a map; unmounting removes it and its resize observer. React state supplies the selected coordinates, and map events report new coordinates back to the location picker.

## Quotes are snapshots

A saved quote contains the destination, optional display name, coordinates when available, distance source, visits, pricing configuration, and calculated amounts. Changing settings affects new quotes; it does not reprice history.

The JSON format remains at version 1. Existing `loadedKm` and `emptyKm` fields represent outbound and return kilometers in the business-neutral UI. These field names and the original browser-storage namespaces are retained for compatibility; they do not select a business or supply business defaults.

Settings and appearance are stored in localStorage; quotes are stored in IndexedDB. Renaming the app or changing its deployment name does not select another database. Browser storage is scoped to the origin, so moving to another domain requires a JSON export/import for quote history and reconfiguration of settings.

## Location and distance

The location picker accepts manual addresses, autocomplete results, decimal coordinates, or degrees/minutes/seconds. Pasted coordinates place a pin without an address search. Search suggestions use the configured base as their location bias, falling back to the deployment map center.

Each visit estimates the same one-way distance in both directions. OSRM supplies the one-way driving distance; the app does not request a separate reverse-direction route. A manual distance overrides pending route requests. Failed network lookups leave manual input available.

See the [glossary](../GLOSSARY.md) for domain terms and the [deployment guide](deployment.md) for service configuration and limits.
