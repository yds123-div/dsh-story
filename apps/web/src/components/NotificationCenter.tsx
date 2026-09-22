import { useEffect, useRef, useState } from 'react';
import { listNotifications } from '../lib/api';
import type { AppNotification } from '../types/api';

export function NotificationCenter() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    void listNotifications()
      .then((data) => setItems(data.notifications))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: Event) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unread = items.some((n) => !n.read);

  return (
    <div ref={wrapRef} className="ds-bellWrap">
      <button type="button" className="ds-bell" title="通知中心" onClick={() => setOpen((v) => !v)}>
        🔔
        {unread ? <i /> : null}
      </button>
      {open ? (
        <div className="ds-notifPanel">
          <div className="nh2">
            🔔 通知中心
            <button
              type="button"
              onClick={() => {
                setItems((list) => list.map((n) => ({ ...n, read: true })));
                setOpen(false);
              }}
            >
              全部已读
            </button>
          </div>
          <div className="list">
            {items.map((n) => (
              <div key={n.id} className="ni">
                <span className="ic">{n.icon}</span>
                <div>
                  <div className="t">{n.title}</div>
                  <div className="d">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
