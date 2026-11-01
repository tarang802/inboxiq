import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ReconnectBanner from './ReconnectBanner';

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <ReconnectBanner />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
