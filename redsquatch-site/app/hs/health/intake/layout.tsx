import type { Metadata } from 'next';

// The install manifest is attached to this route only, so "Add to Home Screen" here
// installs the intake form and nothing else on the site.
export const metadata: Metadata = {
  title: 'Nutrition Intake',
  manifest: '/intake.webmanifest',
  icons: { icon: '/intake/icon-192.png', apple: '/intake/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: 'Intake', statusBarStyle: 'black-translucent' },
};

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
