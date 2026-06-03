import React from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function PushNotificationToggle() {
  const { permission, subscribe, unsubscribe } = usePushNotifications();

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!isSupported) {
    return (
      <span className="text-xs text-[var(--text-muted)]">
        このブラウザはプッシュ通知に対応していません
      </span>
    );
  }

  const isGranted = permission === 'granted';

  return (
    <button
      onClick={isGranted ? unsubscribe : subscribe}
      className={[
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none',
        isGranted ? 'bg-[var(--accent)]' : 'bg-[var(--border)]',
      ].join(' ')}
      aria-label={isGranted ? 'プッシュ通知をオフにする' : 'プッシュ通知をオンにする'}
    >
      <span
        className={[
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          isGranted ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}
