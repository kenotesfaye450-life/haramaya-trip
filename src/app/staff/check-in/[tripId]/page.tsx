import { StaffCheckIn } from '@/components/staff/staff-check-in';

export default async function StaffCheckInPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return <StaffCheckIn tripId={tripId} />;
}
