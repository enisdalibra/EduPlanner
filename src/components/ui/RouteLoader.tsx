import { Icon } from "@/components/ui/icon";
;

export function RouteLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Icon name="progress_activity" className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Memuat halaman...</p>
      </div>
    </div>
  );
}
