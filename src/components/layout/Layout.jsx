import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNav from './TopNav';

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <TopNav />
      {/* Keyed by route so each page eases in */}
      <main key={pathname} className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 animate-rise">
        <Outlet />
      </main>
    </div>
  );
}
