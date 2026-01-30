import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function FirstImportPage() {
  return (
    <BusinessTaskList
      businessType="BONDED_ZONE_FIRST_IMPORT"
      businessCategory="BONDED_ZONE"
      title="一线进仓任务"
      description="综保区一线进仓 - 货物从境外进入综合保税区"
      createUrl="/dashboard/bonded-zone/first-import/new"
    />
  );
}
