/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    onMainProcessMessage: (callback: (message: string) => void) => void;
  };
}
