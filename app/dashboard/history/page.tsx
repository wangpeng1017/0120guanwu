'use client';

import { Card, Empty } from 'antd';

export default function HistoryPage() {
  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">历史记录</h1>
        <p className="text-gray-500">查看历史申报记录和统计数据</p>
      </div>

      <Card>
        <Empty
          description="历史记录功能开发中"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    </div>
  );
}
