# InterfaceForge

A local-first web app for generating polished, interactive interface components and exporting beginner-friendly code packages.

Flow: Describe -> Generate -> Customize -> Preview -> Export.

The MVP runs fully on-device with deterministic local templates. There are no accounts, API keys, backend services, or remote generation calls.

## Run (web)

```bash
npm install
npm run dev
```

## Production build checks

```bash
npm run typecheck
npm run lint:merge
npm run build
```

## iOS App Store scaffold (Capacitor + Xcode)

This repo now includes Capacitor 7 scaffolding suitable for modern iOS packaging workflows:

```bash
npm run build
npm run mobile:sync
npm run mobile:open:ios
```

Then in Xcode (2026 workflow):

1. Select the `App` target and set signing/team/bundle identifier.
2. Ensure deployment target and device family match App Store requirements.
3. Add required privacy usage strings/capabilities for any native plugins you enable.
4. Archive via **Product → Archive**, validate, and upload with Organizer.

> Note: this scaffold keeps the app local-first and WebKit-hosted; add native plugins only as needed.
