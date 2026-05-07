import DashboardListCard from "../../components/dashboard/DashboardListCard";
import CommissionList from "../../components/dashboard/CommissionList";

export default function Commission() {
  return (
    <DashboardListCard
      breadcrumbLabel="Commission"
      title="Commission"
      subtitle="Commission History"
    >
      <CommissionList />
    </DashboardListCard>
  );
}
