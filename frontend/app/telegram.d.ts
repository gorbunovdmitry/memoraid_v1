export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        initDataUnsafe?: unknown;
        expand: () => void;
        ready: () => void;
        showPopup?: (params: { title: string; message: string }) => void;
        showAlert?: (message: string) => void;
        hapticFeedback?: {
          impactOccurred: (style: "light" | "medium" | "heavy") => void;
        };
      };
    };
  }
}

