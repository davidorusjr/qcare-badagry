import type { Metadata } from 'next';
import { CheckInView } from './_components/check-in-view';

export const metadata: Metadata = {
  title: 'Patient Check-In',
};

export default function Page() {
  return <CheckInView />;
}
