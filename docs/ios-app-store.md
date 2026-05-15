# iOS App Store Production Checklist (2026)

This project is scaffolded with Capacitor for iOS packaging and App Store submission readiness.

## Prerequisites

- Xcode 26 or newer.
- Active Apple Developer Program membership.
- Valid signing certificate and provisioning profile.

## Build and Sync

```bash
npm install
npm run build
npm run mobile:sync
npm run mobile:open:ios
```

## Xcode Setup

1. Open the `App` project in Xcode.
2. Configure `Signing & Capabilities`:
   - Team
   - Bundle Identifier
   - Automatic signing (recommended)
3. Set deployment target and device family required by your product strategy.
4. Verify `Info.plist` privacy usage strings for any native capability/plugins in use.
5. Ensure app icon, launch screen, and localized metadata are complete.

## Release

1. Build with `Any iOS Device (arm64)` target.
2. Run **Product → Archive**.
3. Validate archive in Organizer.
4. Upload to App Store Connect and complete submission details.

## Notes

- Keep web assets deterministic and reproducible (`npm ci`, lockfile committed).
- Add Capacitor plugins only when required; audit entitlements and privacy impact each time.
