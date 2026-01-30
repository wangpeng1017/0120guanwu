import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function SecondInPage() {
  return (
    <BusinessTaskList
      businessType="BONDED_ZONE_SECOND_IN_ZONE"
      businessCategory="BONDED_ZONE"
      title="二线进仓任务"
      description="综保区二线进仓 - 货物从境内进入综合保税区"
      createUrl="/dashboard/bonded-zone/second-in/new"
    />
  );
}
