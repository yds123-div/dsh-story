import { NavLink } from 'react-router-dom';
import { message } from 'antd';

const items = [
  { to: '/', icon: '🏠', label: '首页', end: true },
  { to: '/idea', icon: '💡', label: '创意', end: false },
  { to: '/create', icon: '🎬', label: '创作', end: false },
  { to: '/canvas', icon: '🎨', label: '画布', end: false },
  { to: '/plaza', icon: '📦', label: '资产', end: false },
  { to: '/space', icon: '🧊', label: '空间', end: false },
  { to: '/team', icon: '👥', label: '团队', end: false, isTeam: true },
];

export function SideNav() {
  const handleTeamClick = (e: React.MouseEvent) => {
    e.preventDefault();
    message.info('团队功能即将上线');
  };

  return (
    <div className="ds-side">
      <div className="ds-logo">D</div>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={item.isTeam ? handleTeamClick : undefined}
          className={({ isActive }) => `ds-navItem${isActive ? ' on' : ''}`}
        >
          <span className="ico">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
