import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileSliders, LayoutDashboard, FileText, LogOut, PenTool, MessageSquarePlus, UserCircle, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const navItems = [
    { name: 'Overall Performance', path: '/', icon: LayoutDashboard },
    { name: 'Proposal Performance', path: '/proposals', icon: FileText },
    { name: 'Proposal Writing', path: '/write', icon: PenTool },
    { name: 'Client Lead Gen', path: '/leads', icon: MessageSquarePlus },
    { name: 'Customize Details', path: '/profile', icon: UserCircle },
    { name: 'AI Prompts', path: '/ai-prompts', icon: FileSliders },
  ];

  return (
    <aside className="w-64 border-r border-[#292524] bg-[#0c0a09] flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-[#292524]">
        <div className="flex items-center gap-2 text-white font-bold text-lg tracking-wide">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-yellow-600 to-amber-500 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          Upwork AI
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "text-white bg-[#292524]/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-[#44403c]/50" 
                  : "text-stone-400 hover:text-slate-100 hover:bg-[#1c1917]"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                )}
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-amber-400" : "text-stone-500 group-hover:text-stone-300")} />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </div>
      
      <div className="p-4 border-t border-[#292524]">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#1c1917] border border-[#292524]">
          <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 border border-yellow-500/30">
            <UserCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-white truncate">{user?.name || user?.email?.split('@')[0] || 'Strategist'}</span>
            <span className="text-xs text-stone-400 truncate">{user?.email}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="ml-auto p-2 text-stone-500 hover:text-amber-300 hover:bg-[#292524] rounded-lg transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
