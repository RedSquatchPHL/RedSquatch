import OSHeader from '@/components/tonatiuh/OSHeader';

export default function WSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <OSHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
