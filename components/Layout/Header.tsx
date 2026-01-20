'use client';

import { Breadcrumb, Avatar, Dropdown } from 'antd';
import { UserOutlined, BellOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const breadcrumbNameMap: Record<string, string> = {
  '/': '首页',
  '/import': '进口申报',
  '/export': '出口申报',
  '/transfer': '转仓申报',
  '/tasks': '任务管理',
  '/history': '历史记录',
};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [breadcrumbItems, setBreadcrumbItems] = useState<any[]>([{ title: '首页' }]);

  useEffect(() => {
    if (pathname === '/') {
      setBreadcrumbItems([{ title: '首页' }]);
    } else {
      setBreadcrumbItems([
        { title: '首页', href: '/' },
        { title: breadcrumbNameMap[pathname] || '页面' },
      ]);
    }
  }, [pathname]);

  const userMenuItems = [
    {
      key: 'profile',
      label: '个人信息',
    },
    {
      key: 'settings',
      label: '设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: '退出登录',
      onClick: () => console.log('退出登录'),
    },
  ];

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* 左侧面包屑 */}
      <Breadcrumb
        items={breadcrumbItems.map((item) => ({
          ...item,
          onClick: item.href ? () => router.push(item.href) : undefined,
          className: item.href ? 'cursor-pointer hover:text-blue-500' : '',
        }))}
      />

      {/* 右侧操作区 */}
      <div className="flex items-center gap-4">
        {/* 通知图标 */}
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
          <BellOutlined className="text-lg text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 用户信息 */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors">
            <Avatar icon={<UserOutlined />} className="bg-blue-500" />
            <span className="text-sm">关务专员</span>
          </div>
        </Dropdown>
      </div>
    </div>
  );
}
