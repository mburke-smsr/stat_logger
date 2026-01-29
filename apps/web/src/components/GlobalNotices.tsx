import React, { useEffect, useState } from "react";

type Props = {
  onRetryGlobal?: () => void | Promise<void>;
};

type ApiErrorEventDetail = {
  message: string;
  status?: number;
};

export default function GlobalNotices({ onRetryGlobal }: Props) {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const [apiError, setApiError] = useState<ApiErrorEventDetail | null>(null);
  const [apiErrorVisible, setApiErrorVisible] = useState(false);

  useEffect(() => {
    const onNeedRefresh = () => setNeedsRefresh(true);
    const onOfflineReady = () => {
      setOfflineReady(true);
      // auto-hide after a moment
      setTimeout(() => setOfflineReady(false), 3500);
    };

    const onApiError = (e: Event) => {
      const ce = e as CustomEvent<ApiErrorEventDetail>;
      setApiError(ce.detail || { message: "Request failed" });
      setApiErrorVisible(true);
      // auto-hide after 7s (still dismissible)
      setTimeout(() => setApiErrorVisible(false), 7000);
    };

    window.addEventListener("pwa:needRefresh", onNeedRefresh);
    window.addEventListener("pwa:offlineReady", onOfflineReady);
    window.addEventListener("app:apiError", onApiError);

    return () => {
      window.removeEventListener("pwa:needRefresh", onNeedRefresh);
      window.removeEventListener("pwa:offlineReady", onOfflineReady);
      window.removeEventListener("app:apiError", onApiError);
    };
  }, []);

  async function doUpdate() {
    try {
      const updateSW = (window as any).__pwaUpdateSW as undefined | ((reloadPage?: boolean) => Promise<void>);
      if (updateSW) await updateSW(true);
      // Fallback: hard reload
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }

  async function doRetry() {
    try {
      await onRetryGlobal?.();
    } finally {
      setApiErrorVisible(false);
    }
  }

  return (
    <>
      {/* PWA Update Banner */}
      {needsRefresh ? (
        <div className="noticeBar">
          <div>
            <div style={{ fontWeight: 850 }}>Update available</div>
            <div style={{ fontSize: 12, color: "var(--muted2)" }}>
              Reload to get the latest version.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setNeedsRefresh(false)}>
              Later
            </button>
            <button className="btnPrimary" onClick={doUpdate}>
              Reload
            </button>
          </div>
        </div>
      ) : null}

      {/* Offline Ready (optional small toast) */}
      {offlineReady ? (
        <div className="toastSmall">
          Offline ready
        </div>
      ) : null}

      {/* Global API Error Toast */}
      {apiErrorVisible && apiError ? (
        <div className="toastError">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 850 }}>
              {apiError.status ? `Error ${apiError.status}` : "Request failed"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {apiError.message}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={() => setApiErrorVisible(false)}>
              Dismiss
            </button>
            <button className="btnPrimary" onClick={doRetry} disabled={!onRetryGlobal}>
              Retry
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
