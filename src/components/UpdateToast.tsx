import {useRegisterSW} from 'virtual:pwa-register/react';

/** Báo khi có phiên bản mới của app; bấm "Tải lại" để kích hoạt service worker mới. */
export function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="updateToast" role="status">
      {needRefresh ? (
        <>
          <span>Có phiên bản mới của ứng dụng.</span>
          <button onClick={() => updateServiceWorker(true)}>Tải lại</button>
          <button onClick={() => setNeedRefresh(false)}>Để sau</button>
        </>
      ) : (
        <>
          <span>Ứng dụng đã sẵn sàng chạy offline.</span>
          <button onClick={() => setOfflineReady(false)}>Đóng</button>
        </>
      )}
    </div>
  );
}
