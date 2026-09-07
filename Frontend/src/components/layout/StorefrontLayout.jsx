import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 w-full max-w-full overflow-x-clip">
      <Navbar />
      <main className="flex-1 w-full max-w-full min-w-0 px-3.5 sm:px-6 md:px-10 lg:px-14 xl:px-16 py-4 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
