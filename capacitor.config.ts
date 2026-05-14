import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.interfaceforge.app',
  appName: 'InterfaceForge',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: true,
    scrollEnabled: true,
    scheme: 'InterfaceForge'
  },
  server: {
    androidScheme: 'https'
  }
};

export default config;
