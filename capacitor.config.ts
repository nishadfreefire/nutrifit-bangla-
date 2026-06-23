import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fitcoach',
  appName: 'FitCoach BD',
  webDir: 'dist',
  server: {
    // Live connect to deployed/preview server — app always loads latest version
    url: 'https://id-preview--76167e8b-995c-4373-a15a-673672bdb7ce.lovable.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0F172A',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
  },
};

export default config;
