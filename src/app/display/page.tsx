import type { Metadata, Viewport } from 'next';
import { DisplayView } from '../_components/display-view';

export const metadata: Metadata = {
  title: 'Waiting Room Display',
  robots: { index: false, follow: false },
};

// The TV is always dark, whatever the visitor's theme
export const viewport: Viewport = {
  themeColor: '#0b1120',
  colorScheme: 'dark',
};

export default function Page() {
  return <DisplayView />;
}
