import OSHeader from '@/components/tonatiuh/OSHeader';
import SideRail from '@/components/tonatiuh/SideRail';
import FxPointer from '@/components/tonatiuh/FxPointer';
import './ws-fx.css';

export default function WSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ws-fx min-h-screen flex">
      <div className="ws-sun" aria-hidden>
        <span className="ws-sun-work" />
        <span className="ws-sun-dusk" />
        <span className="ws-sun-night" />
        <span className="ws-sun-dawn" />
      </div>
      <FxPointer />
      <SideRail />
      <div className="flex-1 min-w-0 flex flex-col">
        <OSHeader />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
