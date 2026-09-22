import { Typography } from 'antd';

export function PlaceholderPage({ title, hint }: { title: string; hint?: string }) {
  return (
    <div style={{ padding: '30px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 className="ds-h2">{title}</h2>
      {hint ? (
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
          {hint}
        </Typography.Text>
      ) : null}
    </div>
  );
}
