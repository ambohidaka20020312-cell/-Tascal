import { useEffect, useState } from "react";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const [showRestored, setShowRestored] = useState(false);
  const [visible, setVisible] = useState(false);
  const [prevOnline, setPrevOnline] = useState(isOnline);

  useEffect(() => {
    if (isOnline && !prevOnline) {
      setVisible(false);
      setShowRestored(true);
      const timer = setTimeout(() => setShowRestored(false), 2000);
      setPrevOnline(true);
      return () => clearTimeout(timer);
    }
    if (!isOnline) {
      setVisible(true);
      setShowRestored(false);
    }
    setPrevOnline(isOnline);
  }, [isOnline]);

  if (!visible && !showRestored) return null;

  if (showRestored) {
    return (
      <div className="w-full bg-green-500 text-white text-center py-2 text-sm font-medium z-50">
        ✅ オンラインに復帰しました
      </div>
    );
  }

  return (
    <div className="w-full bg-yellow-400 text-yellow-900 text-center py-2 text-sm font-medium z-50">
      📡 オフライン中 — キャッシュされたデータを表示しています
    </div>
  );
}
