import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Compass, FileSliders, Globe2, LayoutGrid, LogOut, Megaphone, PenLine, Rows3, UserRound,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Logo, ThemeToggle, TONES } from '../ui';

export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutGrid, tone: 'ember' },
  { name: 'Proposals', path: '/proposals', icon: Rows3, tone: 'sky' },
  { name: 'Writer', path: '/write', icon: PenLine, tone: 'flamingo' },
  { name: 'Leads', path: '/leads', icon: Megaphone, tone: 'sunbeam' },
  { name: 'Strategy', path: '/strategy', icon: Compass, tone: 'ultraviolet' },
  { name: 'Research', path: '/research', icon: Globe2, tone: 'lagoon' },
  { name: 'Profile', path: '/profile', icon: UserRound, tone: 'ember' },
  { name: 'Prompts', path: '/ai-prompts', icon: FileSliders, tone: 'flamingo' },
];

const initialsOf = (user) => {
  const source = user?.name || user?.email || '?';
  const parts = source.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
};

function NavPill({ item }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => cn(
        'group relative inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200',
        isActive ? 'bg-surface-2 text-ink ring-1 ring-line' : 'text-ink-2 hover:text-ink hover:bg-surface-2'
      )}
    >
      {({ isActive }) => (
        <>
          <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-lg transition-colors', isActive ? TONES[item.tone].icon : 'text-ink-3 group-hover:text-ink-2')}>
            <item.icon className="w-[0.95rem] h-[0.95rem]" />
          </span>
          {item.name}
        </>
      )}
    </NavLink>
  );
}

function UserMenu() {
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Account menu"
        aria-expanded={open}
        className="w-10 h-10 rounded-xl bg-lagoon text-on-accent font-display font-bold text-sm flex items-center justify-center hover:brightness-110 transition"
      >
        {user?.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" /> : initialsOf(user)}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 card p-2 animate-pop z-50">
          <div className="px-3 py-2.5">
            <p className="font-semibold text-ink truncate">{user?.name || user?.email?.split('@')[0]}</p>
            <p className="text-xs text-ink-3 truncate">{user?.email}</p>
          </div>
          <div className="h-px bg-line my-1" />
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-2 hover:text-danger hover:bg-danger-soft transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 px-3 sm:px-5 pt-3">
      <div className="glass rounded-[1.4rem] max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 h-16 px-3 sm:px-4">
          <NavLink to="/" className="shrink-0" aria-label="BoostWork home">
            <Logo className="hidden sm:inline-flex" />
            <Logo compact className="sm:hidden" />
          </NavLink>

          <nav className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0" aria-label="Main">
            {NAV_ITEMS.map((item) => <NavPill key={item.path} item={item} />)}
          </nav>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        <nav className="lg:hidden flex items-center gap-1 overflow-x-auto px-3 pb-3 -mt-1 [scrollbar-width:none]" aria-label="Main">
          {NAV_ITEMS.map((item) => <NavPill key={item.path} item={item} />)}
        </nav>
      </div>
    </header>
  );
}
