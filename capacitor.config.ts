import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.student.attendance.calculator',

  appName: 'Attendly',

  webDir: 'dist',

  server: {
    androidScheme: 'https',
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#1a1a2e',

    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },

   

    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
    },

    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
  },
};

export default config;