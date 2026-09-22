import { theme } from 'antd';
import type { ThemeConfig } from 'antd';

/**
 * hogee-demo-assets/shared.css → AntD 5 暗色主题 token 映射。
 * 拷自 prototype/src/theme.ts（FINDINGS 变体 B）。
 */
export const hogeeDarkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  cssVar: true,
  token: {
    colorPrimary: '#8b5cf6',
    colorSuccess: '#4ecf8d',
    colorError: '#e05d5d',
    colorWarning: '#e8c37a',
    colorInfo: '#5eead4',
    colorText: '#ececf4',
    colorTextSecondary: '#9a9ab2',
    colorTextTertiary: '#6b6b82',
    colorBgLayout: '#0a0a10',
    colorBgContainer: '#15151f',
    colorBgElevated: '#1b1b28',
    colorBorder: '#3a3a50',
    colorBorderSecondary: '#2a2a3a',
    borderRadius: 10,
    borderRadiusLG: 16,
    boxShadowSecondary: '0 10px 30px rgba(0,0,0,.45)',
    fontFamily: '"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif',
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#101018',
      siderBg: '#101018',
      bodyBg: '#0a0a10',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Menu: {
      itemBg: 'transparent',
      subMenuItemBg: 'transparent',
      itemColor: '#6b6b82',
      itemHoverColor: '#9a9ab2',
      itemHoverBg: '#1b1b28',
      itemSelectedBg: 'rgba(139,92,246,.30)',
      itemSelectedColor: '#fff',
      itemMarginInline: 9,
      itemMarginBlock: 3,
      itemHeight: 44,
      itemBorderRadius: 12,
    },
    Button: {
      primaryShadow: '0 6px 18px rgba(139,92,246,.35)',
      fontWeight: 600,
    },
    Modal: {
      contentBg: '#15151f',
      headerBg: 'transparent',
    },
  },
};

export const hogeeLightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  cssVar: true,
  token: {
    colorPrimary: '#8b5cf6',
    colorSuccess: '#4ecf8d',
    colorError: '#e05d5d',
    colorWarning: '#e8c37a',
    colorInfo: '#5eead4',
    colorText: '#22242f',
    colorTextSecondary: '#5b5f76',
    colorTextTertiary: '#8f93ab',
    colorBgLayout: '#f2f3f8',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#f4f5fa',
    colorBorder: '#d2d6e5',
    colorBorderSecondary: '#e3e5ef',
    borderRadius: 10,
    borderRadiusLG: 16,
    boxShadowSecondary: '0 10px 30px rgba(80,84,120,.12)',
    fontFamily: '"PingFang SC","Microsoft YaHei","Segoe UI",sans-serif',
    fontSize: 14,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      bodyBg: '#f2f3f8',
      headerHeight: 56,
      headerPadding: '0 20px',
    },
    Button: {
      primaryShadow: '0 6px 18px rgba(139,92,246,.35)',
      fontWeight: 600,
    },
    Modal: {
      contentBg: '#ffffff',
      headerBg: 'transparent',
    },
  },
};
