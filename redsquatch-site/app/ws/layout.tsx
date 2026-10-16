import OSHeader from '@/components/tonatiuh/OSHeader';
import SideRail from '@/components/tonatiuh/SideRail';

export default function WSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <SideRail />
      <div className="flex-1 min-w-0 flex flex-col pb-14 md:pb-0">
        <OSHeader />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
