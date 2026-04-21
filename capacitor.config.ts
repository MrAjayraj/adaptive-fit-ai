import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.fitpulse.app',
  appName: 'Fit Pulse',
  webDir: 'dist',
  server: {
    // For development, uncomment and set your LAN IP:
    // url: 'http://192.168.x.x:5173',
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#06090D',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#06090D',
    },
  },
};

export default config;
