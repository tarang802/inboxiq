import { Outlet } from 'react-router-dom';
import Footer from './Footer';
import Navbar from './Navbar';
import ReconnectBanner from './ReconnectBanner';

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <ReconnectBanner />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
