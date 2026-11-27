import type { Metadata } from 'next';
import { StaffView } from '../_components/staff-view';

export const metadata: Metadata = {
  title: 'Staff Workspace',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <StaffView />;
}
