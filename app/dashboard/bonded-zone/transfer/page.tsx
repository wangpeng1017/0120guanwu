import { BusinessTaskList } from '@/components/TaskList/BusinessTaskList';

export default function TransferPage() {
  return (
    <BusinessTaskList
      businessType="BONDED_ZONE_TRANSFER"
      businessCategory="BONDED_ZONE"
      title="区内流转任务"
      description="综保区区内流转 - 货物在综合保税区内流转"
      createUrl="/dashboard/bonded-zone/transfer/new"
    />
  );
}
