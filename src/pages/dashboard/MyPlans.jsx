import DashboardListCard from "../../components/dashboard/DashboardListCard";

export default function MyPlans() {
  return (
    <DashboardListCard
      breadcrumbLabel="My Plans"
      title="Active Plans"
      subtitle="List of all active investments!"
      emptyText="No Active Plans Found"
    />
  );
}
