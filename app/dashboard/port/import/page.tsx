import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function PortImportPage() {
  return (
    <BusinessTaskList
      businessType="PORT_IMPORT"
      businessCategory="PORT"
      title="口岸进口任务"
      description="口岸进口 - 货物从境外进口"
      createUrl="/dashboard/port/import/new"
    />
  );
}
