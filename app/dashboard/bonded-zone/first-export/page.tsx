import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function FirstExportPage() {
  return (
    <BusinessTaskList
      businessType="BONDED_ZONE_FIRST_EXPORT"
      businessCategory="BONDED_ZONE"
      title="一线出仓任务"
      description="综保区一线出仓 - 货物从综合保税区出境"
      createUrl="/dashboard/bonded-zone/first-export/new"
    />
  );
}
