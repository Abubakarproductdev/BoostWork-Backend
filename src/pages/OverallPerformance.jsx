import React, { useState, useMemo } from 'react';
import { useJobContext } from '../context/JobContext';
import { differenceInDays, parseISO } from 'date-fns';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Briefcase, Eye, MessageSquare, DollarSign, Award, ChevronDown } from 'lucide-react';

export default function OverallPerformance() {
  const { jobs } = useJobContext();
  const [timeframe, setTimeframe] = useState(30);

  // Derived metrics based on timeframe
  const metrics = useMemo(() => {
    const now = new Date();
    
    // Filter jobs by time frame
    const filteredJobs = jobs.filter(job => {
      if (!job.appliedAt) return false;
      try {
        const diff = differenceInDays(now, parseISO(job.appliedAt));
        return diff <= timeframe;
      } catch {
        return false;
      }
    });

    const applied = filteredJobs.length;
    let viewed = 0;
    let responses = 0;
    let won = 0;
    let earned = 0;

    filteredJobs.forEach(job => {
      if (job.status === 'view') viewed++;
      if (job.status === 'response') {
        viewed++; // if response, it must be viewed
        responses++;
      }
      if (job.status === 'won') {
        viewed++;
        responses++;
        won++;
        // Rough mock calculation safely from budget or budgetDisplay
        const budgetStr = typeof job.budget === 'string' ? job.budget : (job.budgetDisplay || '');
        earned += budgetStr.includes('$') || /\d/.test(budgetStr) ? parseInt(budgetStr.replace(/[^0-9]/g, '')) || 500 : 500;
      }
    });

    // Generate mock graph data to fill the space beautifully
    const areaData = Array.from({ length: 7 }).map((_, i) => ({
      name: `Day ${i + 1}`,
      applied: Math.floor(Math.random() * 5) + 1,
      viewed: Math.floor(Math.random() * 4),
    }));

    const statusData = [
      { name: 'Applied', value: applied, color: '#f59e0b' },
      { name: 'Viewed', value: viewed, color: '#eab308' },
      { name: 'Responsed', value: responses, color: '#10b981' },
      { name: 'Won', value: won, color: '#d97706' }
    ];

    return { applied, viewed, responses, won, earned, areaData, statusData };
  }, [jobs, timeframe]);

  const statCards = [
    { label: 'Jobs Applied', value: metrics.applied, icon: Briefcase, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Proposals Viewed', value: metrics.viewed, icon: Eye, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: 'Responses', value: metrics.responses, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Jobs Won', value: metrics.won, icon: Award, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Earned Amount', value: `$${metrics.earned.toLocaleString()}`, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Overall Performance</h1>
          <p className="text-stone-400 mt-1">Analytics for the selected timeframe</p>
        </div>
        
        <div className="relative">
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(Number(e.target.value))}
            className="appearance-none bg-[#292524] text-white border border-[#44403c] rounded-xl px-5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500/50 hover:bg-[#273549] transition-colors cursor-pointer font-medium shadow-sm transition-all"
          >
            <option value={1}>Last 1 Day</option>
            <option value={3}>Last 3 Days</option>
            <option value={7}>Last 7 Days</option>
            <option value={15}>Last 15 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="glass-panel p-5 rounded-2xl relative overflow-hidden group hover:border-white/10 hover:bg-[#292524]/50 transition-all cursor-default">
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity ${stat.bg.replace('/10', '')}`} />
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-stone-400">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1 tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Application Tracker (Area)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.areaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApplied" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViewed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403c" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '14px' }}
                />
                <Area type="monotone" dataKey="applied" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorApplied)" />
                <Area type="monotone" dataKey="viewed" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorViewed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Conversion Funnel</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.statusData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#44403c" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#e2e8f0" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: '#292524'}} 
                  contentStyle={{ backgroundColor: '#1c1917', border: '1px solid #44403c', borderRadius: '12px' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {metrics.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
