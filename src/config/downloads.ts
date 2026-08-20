// Configuração oficial de URLs de download dos instaladores VarejoPro
export const DOWNLOAD_CONFIG = {
  windows: process.env.VITE_WINDOWS_DOWNLOAD_URL || 'https://releases.varejopro.com/windows/VarejoPro-Setup-latest.exe',
  android: process.env.VITE_ANDROID_DOWNLOAD_URL || 'https://releases.varejopro.com/android/varejopro-pos-latest.apk',
  webPwa: window.location.origin
};
