import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function StorefrontLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 w-full px-6 sm:px-10 lg:px-14 xl:px-16 py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
