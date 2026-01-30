import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function PortExportPage() {
  return (
    <BusinessTaskList
      businessType="PORT_EXPORT"
      businessCategory="PORT"
      title="口岸出口任务"
      description="口岸出口 - 货物出口到境外"
      createUrl="/dashboard/port/export/new"
    />
  );
}
