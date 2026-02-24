import { AdminGuard } from "../features/admin/AdminGuard";
import { AdminTabs } from "../features/admin/AdminTabs";

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-semibold">Admin Console</div>
              <div className="text-sm muted mt-1">
                KYC / Users / Orders / Config Management Panel
              </div>
            </div>

            <div className="pill">
              <span className="w-2 h-2 rounded-full bg-emerald-400/80" />
              Live
            </div>
          </div>
        </div>

        <div className="col-span-12">
          <AdminTabs />
        </div>
      </div>
    </AdminGuard>
  );
}
