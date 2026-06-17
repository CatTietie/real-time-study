import cron from "node-cron";
import DashboardSnapshot from "../models/dashboard-snapshot.model";
import { aggregateDashboardPayload } from "./dashboard-realtime.service";

export function initDashboardSnapshotCron(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      const payload = aggregateDashboardPayload();
      await DashboardSnapshot.create({
        snapshot_data: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("[Dashboard Snapshot] Save failed:", err);
    }
  });

  console.log("📸 Dashboard snapshot cron started (every 5 minutes)");
}
