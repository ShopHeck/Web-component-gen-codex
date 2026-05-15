# InterfaceForge

A local-first web app for generating polished, interactive interface components and exporting beginner-friendly code packages.

Flow: Describe -> Generate -> Customize -> Preview -> Export.

The MVP runs fully on-device with deterministic local templates. There are no accounts, API keys, backend services, or remote generation calls.

## Run (web)

```bash
npm install
npm run dev
```

## Production checks

```bash
npm run lint:merge
npm run typecheck
npm run build
```

## iOS App Store packaging

Capacitor scaffold is included for iOS builds. Use:

```bash
npm run mobile:sync
npm run mobile:open:ios
```

Detailed submission checklist is in [`docs/ios-app-store.md`](docs/ios-app-store.md).
