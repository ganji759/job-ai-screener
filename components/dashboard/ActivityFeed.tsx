import { Card } from "../ui/Card";

export const ActivityFeed = ({ items }: { items: Array<{ status: string; createdAt: string }> }) => (
  <Card>
    <h3 className="mb-1 font-semibold text-slate-900">Recent Activity</h3>
    <p className="mb-4 text-sm text-slate-600">Latest screening events and status changes.</p>
    <div className="max-h-64 space-y-2 overflow-y-auto text-sm">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-4 py-6 text-center text-slate-500">No recent activity yet.</p>
      ) : (
        items.map((item, index) => (
          <div
            key={`${item.createdAt}-${index}`}
            className="flex items-start gap-3 rounded-xl border border-brand-100/80 bg-brand-50/30 px-3 py-2.5"
          >
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
            <div>
              <p className="font-medium text-brand-900">{item.status}</p>
              <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))
      )}
    </div>
  </Card>
);
