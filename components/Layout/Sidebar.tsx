'use client';

import { Menu } from 'antd';
import {
  HomeOutlined,
  DownloadOutlined,
  UploadOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store';
import { MENU_ITEMS } from '@/lib/constants';
import { useEffect, useState } from 'react';

const iconMap: Record<string, React.ElementType> = {
  HomeOutlined,
  DownloadOutlined,
  UploadOutlined,
  SwapOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [selectedKey, setSelectedKey] = useState('/');

  useEffect(() => {
    // 处理路由匹配
    if (pathname === '/') {
      setSelectedKey('/');
    } else if (pathname.startsWith('/import')) {
      setSelectedKey('/import');
    } else if (pathname.startsWith('/export')) {
      setSelectedKey('/export');
    } else if (pathname.startsWith('/transfer')) {
      setSelectedKey('/transfer');
    } else if (pathname.startsWith('/tasks')) {
      setSelectedKey('/tasks');
    } else if (pathname.startsWith('/history')) {
      setSelectedKey('/history');
    } else {
      setSelectedKey(pathname);
    }
  }, [pathname]);

  const menuItems = MENU_ITEMS.map((item) => {
    const IconComponent = iconMap[item.icon];
    return {
      key: item.key,
      icon: <IconComponent />,
      label: item.label,
    };
  });

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  return (
    <div
      className={`h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col ${
        sidebarCollapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="text-lg font-semibold">关务AI申报</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors ml-auto"
        >
          {sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>
      </div>

      {/* 菜单区域 */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={handleMenuClick}
        className={`flex-1 bg-transparent border-none ${
          sidebarCollapsed ? 'w-20' : 'w-60'
        }`}
        inlineCollapsed={sidebarCollapsed}
        theme="dark"
      />

      {/* 底部版本信息 */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-slate-700 text-center text-slate-400 text-sm">
          v0.1.0 Demo
        </div>
      )}
    </div>
  );
}
