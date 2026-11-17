import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user is running the app inside:
 * - Installed PWA / Native Standalone mode (`isPWA === true`)
 * - Standard web browser tab (`isWeb === true`)
 *
 * Also provides PWA install prompt trigger (`canInstall`, `promptInstall`).
 */
export function usePlatform() {
  const [isPWA, setIsPWA] = useState(() => {
    if (typeof window === 'undefined') return false;

    // 1. Check display-mode standalone (Android / Desktop Chrome / Edge)
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;

    // 2. Check iOS Safari standalone
    const isIOSStandalone = window.navigator.standalone === true;

    // 3. Check start_url query param
    const isUrlPWA = new URLSearchParams(window.location.search).get('source') === 'pwa';

    // 4. Check Android TWA / app referrer
    const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

    return isStandaloneDisplay || isIOSStandalone || isUrlPWA || isAndroidApp;
  });

  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    // Listen for display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e) => {
      setIsPWA(e.matches || window.navigator.standalone === true);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    // Capture install prompt event for custom "Install App" buttons
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPromptEvent) return false;
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    return outcome === 'accepted';
  };

  return {
    isPWA,
    isWeb: !isPWA,
    canInstall: Boolean(installPromptEvent),
    promptInstall,
  };
}

/**
 * Component to render children ONLY when running inside the installed PWA / App.
 */
export function AppOnly({ children, fallback = null }) {
  const { isPWA } = usePlatform();
  return isPWA ? children : fallback;
}

/**
 * Component to render children ONLY when running in the standard web browser.
 */
export function WebOnly({ children, fallback = null }) {
  const { isWeb } = usePlatform();
  return isWeb ? children : fallback;
}

export default usePlatform;
