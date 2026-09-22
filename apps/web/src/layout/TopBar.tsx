import { useEffect, useState } from 'react';
import { Button, Flex } from 'antd';
import { getCredits } from '../lib/api';
import { useThemeStore } from '../stores/themeStore';
import { NotificationCenter } from '../components/NotificationCenter';

export function TopBar() {
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCredits()
      .then((c) => {
        if (!cancelled) setBalance(c.balance);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Flex align="center" gap={10} style={{ height: '100%' }}>
      <div className="ds-brand">
        <div className="ds-mark">D</div>
        <div className="bt">
          <b>DeepSFV</b>
          <span>AI 短剧工坊 · 逆命木叶</span>
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <Button className="ds-pill">领取创作者权益</Button>
      <Button className="ds-pill">商务合作</Button>
      <button type="button" className="ds-themeBtn" title="切换 明亮 / 暗色主题" onClick={toggle}>
        {mode === 'light' ? '🌙' : '☀️'}
      </button>
      <Button className="ds-pill ds-vip">⚡ 开通会员</Button>
      <div className="ds-credit">◆ {balance ?? '—'}</div>
      <NotificationCenter />
      <div className="ds-avatar">赵</div>
    </Flex>
  );
}
