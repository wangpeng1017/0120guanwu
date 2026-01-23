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
    // 处理路由匹配（更新为新的菜单结构）
    if (pathname === '/' || pathname === '/dashboard' || pathname === '/dashboard/page') {
      setSelectedKey('/');
    } else if (pathname.startsWith('/dashboard/bonded-zone')) {
      setSelectedKey(pathname);
    } else if (pathname.startsWith('/dashboard/port')) {
      setSelectedKey(pathname);
    } else if (pathname.startsWith('/dashboard/tasks')) {
      setSelectedKey('/dashboard/tasks');
    } else if (pathname.startsWith('/dashboard/history')) {
      setSelectedKey('/dashboard/history');
    } else {
      setSelectedKey(pathname);
    }
  }, [pathname]);

  const menuItems = MENU_ITEMS.map((item) => {
    const IconComponent = iconMap[item.icon];

    // 如果有子菜单，返回子菜单结构
    if (item.children && item.children.length > 0) {
      return {
        key: item.key,
        icon: <IconComponent />,
        label: item.label,
        children: item.children.map(child => ({
          key: child.key,
          label: child.label,
        })),
      };
    }

    // 普通菜单项
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
      className={`h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
        sidebarCollapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">G</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">关务AI申报</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto text-gray-600"
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
        className={`flex-1 border-none ${
          sidebarCollapsed ? 'w-20' : 'w-60'
        }`}
        inlineCollapsed={sidebarCollapsed}
      />

      {/* 底部版本信息 */}
      {!sidebarCollapsed && (
        <div className="p-4 border-t border-gray-200 text-center text-gray-400 text-sm">
          v0.1.0 Demo
        </div>
      )}
    </div>
  );
}
