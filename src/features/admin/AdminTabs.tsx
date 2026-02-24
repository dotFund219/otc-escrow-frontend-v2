import { useState } from "react";
import { AdminUsersPanel } from "./users/AdminUsersPanel";
import { AdminOrdersPanel } from "./orders/AdminOrdersPanel";
import { AdminConfigPanel } from "./config/AdminConfigPanel";
// import { AdminKycPanel } from "./kyc/AdminKycPanel";
// import { AdminOrdersPanel } from "./orders/AdminOrdersPanel";
// import { AdminEventsPanel } from "./events/AdminEventsPanel";
// import { AdminSyncPanel } from "./sync/AdminSyncPanel";
// import { AdminConfigPanel } from "./config/AdminConfigPanel";

const tabs = [
  { key: "users", label: "Users" },
  { key: "orders", label: "Orders" },
  { key: "events", label: "Events" },
  { key: "sync", label: "Sync" },
  { key: "config", label: "Config" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function AdminTabs() {
  const [tab, setTab] = useState<TabKey>("users");

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`btn ${tab === t.key ? "btn-primary" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "users" && <AdminUsersPanel />}
        {tab === "orders" && <AdminOrdersPanel />}
        {/* {tab === "events" && <AdminEventsPanel />}
        {tab === "sync" && <AdminSyncPanel />} */}
        {tab === "config" && <AdminConfigPanel />}
      </div>
    </div>
  );
}
