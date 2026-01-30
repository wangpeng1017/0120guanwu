import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function SecondOutPage() {
  return (
    <BusinessTaskList
      businessType="BONDED_ZONE_SECOND_OUT_ZONE"
      businessCategory="BONDED_ZONE"
      title="二线出仓任务"
      description="综保区二线出仓 - 货物从综合保税区进入境内"
      createUrl="/dashboard/bonded-zone/second-out/new"
    />
  );
}
