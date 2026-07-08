export default function WSToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/css/forest-theme.css" />
      {children}
    </>
  );
}
