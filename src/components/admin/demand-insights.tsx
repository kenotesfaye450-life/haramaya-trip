import { orm } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export async function DemandInsights() {
  const today = new Date();
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const allTrips = await orm.Trip.where({
    status: "PUBLISHED",
  })
    .include("originLocation")
    .include("destinationLocation")
    .orderBy((t) => t.departureAt.asc())
    .all();

  const trips = allTrips.filter((t) => {
    const dept = new Date(t.departureAt);
    return dept >= today && dept <= thirtyDaysFromNow;
  });

  const totalCapacity = trips.reduce((sum, trip) => sum + trip.seatCapacity, 0);
  const totalReserved = trips.reduce((sum, trip) => sum + trip.seatsReserved, 0);
  const averageOccupancy = totalCapacity > 0 ? Math.round((totalReserved / totalCapacity) * 100) : 0;

  // Group by route
  const routeStats = trips.reduce((acc, trip) => {
    const routeKey = `${trip.originLocation.name} → ${trip.destinationLocation.name}`;
    if (!acc[routeKey]) {
      acc[routeKey] = {
        route: routeKey,
        trips: 0,
        capacity: 0,
        reserved: 0,
      };
    }
    acc[routeKey].trips += 1;
    acc[routeKey].capacity += trip.seatCapacity;
    acc[routeKey].reserved += trip.seatsReserved;
    return acc;
  }, {} as Record<string, { route: string; trips: number; capacity: number; reserved: number }>);

  const routeData = Object.values(routeStats).map((stat) => ({
    ...stat,
    occupancy: stat.capacity > 0 ? Math.round((stat.reserved / stat.capacity) * 100) : 0,
  }));

  // Group by day of week
  const dayOfWeekStats: Record<string, { day: string; trips: number; capacity: number; reserved: number }> = {};
  trips.forEach((trip) => {
    const dayOfWeek = new Date(trip.departureAt).toLocaleDateString("en-US", { weekday: "long" });
    if (!dayOfWeekStats[dayOfWeek]) {
      dayOfWeekStats[dayOfWeek] = {
        day: dayOfWeek,
        trips: 0,
        capacity: 0,
        reserved: 0,
      };
    }
    dayOfWeekStats[dayOfWeek].trips += 1;
    dayOfWeekStats[dayOfWeek].capacity += trip.seatCapacity;
    dayOfWeekStats[dayOfWeek].reserved += trip.seatsReserved;
  });

  const weekdayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weekdayData = weekdayOrder
    .map((day) => dayOfWeekStats[day])
    .filter(Boolean)
    .map((stat) => ({
      ...stat,
      occupancy: stat.capacity > 0 ? Math.round((stat.reserved / stat.capacity) * 100) : 0,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 pb-4 border-b border-[#E3E8E5]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0A]">
            Demand & Route Analytics
          </h1>
          <p className="text-xs text-[#66706A] mt-0.5">
            Fleet capacity and seat reservation trends across the next 30 days.
          </p>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-[#E3E8E5] rounded-xl p-5 text-xs shadow-xs">
        <div className="border-b sm:border-b-0 sm:border-r border-[#E3E8E5] pb-3 sm:pb-0 pr-4">
          <div className="text-[#66706A] uppercase font-semibold text-[11px]">Total Capacity</div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-[#0A0A0A] mt-1">{totalCapacity}</div>
          <div className="text-[#66706A] text-[11px] mt-0.5">Scheduled seats</div>
        </div>
        <div className="border-b sm:border-b-0 sm:border-r border-[#E3E8E5] pb-3 sm:pb-0 pr-4">
          <div className="text-[#66706A] uppercase font-semibold text-[11px]">Reserved Seats</div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-brand-green mt-1">{totalReserved}</div>
          <div className="text-[#66706A] text-[11px] mt-0.5">Confirmed bookings</div>
        </div>
        <div>
          <div className="text-[#66706A] uppercase font-semibold text-[11px]">System Occupancy</div>
          <div className="text-2xl md:text-3xl font-extrabold font-mono text-[#0A0A0A] mt-1">{averageOccupancy}%</div>
          <div className="text-[#66706A] text-[11px] mt-0.5">Capacity utilized</div>
        </div>
      </div>

      {/* Route Performance Table */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-green" />
          <span>Demand by Route</span>
        </h2>
        <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Trips Scheduled</th>
                  <th className="px-4 py-3">Booked / Total Capacity</th>
                  <th className="px-4 py-3 text-right">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8E5]/70">
                {routeData.map((route, index) => (
                  <tr key={index} className="hover:bg-[#F8FAF9]/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{route.route}</td>
                    <td className="px-4 py-3 font-mono text-[#374151]">{route.trips}</td>
                    <td className="px-4 py-3 font-mono text-[#374151]">
                      {route.reserved} / {route.capacity} seats
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Badge
                        variant={
                          route.occupancy >= 80 ? "success" : route.occupancy >= 50 ? "neutral" : "warning"
                        }
                      >
                        {route.occupancy}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekday Distribution Table */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold text-[#0A0A0A] uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-brand-green" />
          <span>Weekly Departure Distribution</span>
        </h2>
        <div className="bg-white border border-[#E3E8E5] rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF9] border-b border-[#E3E8E5] text-[#66706A] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Day of Week</th>
                  <th className="px-4 py-3">Trips</th>
                  <th className="px-4 py-3">Booked / Capacity</th>
                  <th className="px-4 py-3 text-right">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8E5]/70">
                {weekdayData.map((day, index) => (
                  <tr key={index} className="hover:bg-[#F8FAF9]/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{day.day}</td>
                    <td className="px-4 py-3 font-mono text-[#374151]">{day.trips}</td>
                    <td className="px-4 py-3 font-mono text-[#374151]">
                      {day.reserved} / {day.capacity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono font-bold text-[#0A0A0A]">{day.occupancy}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
