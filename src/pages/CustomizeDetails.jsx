import React, { useState, useEffect } from 'react';
import { UserCircle, Save, Plus, Trash2, Link as LinkIcon, FolderKanban } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

export default function CustomizeDetails() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile matches the backend exactly
  const [profile, setProfile] = useState({
    fullName: '',
    title: '',
    bio: '',
  });

  const [projects, setProjects] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        const response = await apiFetch(`/api/portfolio`);
        const data = await response.json();
        
        const portfolio = data.success ? data.data : {};
        const savedProjects = portfolio.projects || [];
        const savedLinks = portfolio.links || [];

        // A brand-new account gets an empty profile; keep every input controlled.
        setProfile({
          fullName: portfolio.profile?.fullName || '',
          title: portfolio.profile?.title || '',
          bio: portfolio.profile?.bio || '',
        });

        setProjects(savedProjects.length
          ? savedProjects.map((p, index) => ({
              id: p._id || p.id || Date.now() + index,
              title: p.title || p.name || '',
              description: p.description || '',
              link: p.link || '',
              tech: Array.isArray(p.technologies)
                ? p.technologies.join(', ')
                : (p.tech || '')
            }))
          : [{ id: Date.now(), title: '', description: '', tech: '', link: '' }]);

        setLinks(savedLinks.length
          ? savedLinks.map((l, index) => ({ id: l._id || l.id || Date.now() + index, name: l.name || '', url: l.url || '' }))
          : [{ id: Date.now(), name: '', url: '' }]);
      } catch (error) {
        console.error('Error fetching portfolio data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  // --- POST DATA TO BACKEND ---
  const handleSave = async () => {
    setIsSaving(true);
    
    // MAP PROJECTS: Convert Frontend state back to exact JSON Schema
    // Blank rows are skipped: the backend requires a project title / link name.
    const formattedProjects = projects.filter(p => p.title.trim()).map(p => ({
      title: p.title,
      description: p.description,
      link: p.link,
      // Convert "React, Node" string back into an Array ["React", "Node"]
      technologies: p.tech.split(',').map(item => item.trim()).filter(Boolean)
    }));

    const payload = {
      profile,
      projects: formattedProjects,
      links: links.filter(l => l.name.trim()).map(({ name, url }) => ({ name, url }))
    };

    try {
      const response = await apiFetch(`/api/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!data.success) {
        alert('Failed to save portfolio data: ' + data.message);
      }
    } catch (error) {
      console.error('Error saving portfolio data:', error);
      alert('Network error while saving data.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full bg-[#1c1917] text-white border border-[#44403c] rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-stone-500";
  const labelClass = "block text-sm font-medium text-stone-400 mb-1.5";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-stone-400 animate-pulse">Loading portfolio context...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 h-full overflow-y-auto pr-2 custom-scrollbar">
      <div className="flex items-center justify-between sticky top-0 bg-[#0a0f1c]/90 backdrop-blur-md z-10 py-4 -my-4 border-b border-[#292524] mb-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <UserCircle className="w-8 h-8 text-amber-500" />
            Customize My Details
          </h1>
          <p className="text-stone-400 mt-1">Information used as context by the AI Proposal Writer</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 flex items-center gap-2 disabled:opacity-75"
        >
          {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save className="w-4 h-4" /> Save Profile</>}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Core Details */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-xl font-bold text-white pb-3 border-b border-[#44403c]">Core Identity</h2>
            
            <div>
              <label className={labelClass}>Full Name</label>
              <input 
                type="text" 
                value={profile.fullName} 
                onChange={e => setProfile({...profile, fullName: e.target.value})} 
                className={inputClass} 
              />
            </div>
            
            <div>
              <label className={labelClass}>Professional Title</label>
              <input 
                type="text" 
                value={profile.title} 
                onChange={e => setProfile({...profile, title: e.target.value})} 
                className={inputClass} 
              />
            </div>
            
            <div>
              <label className={labelClass}>Bio / Summary</label>
              <textarea 
                rows={6}
                value={profile.bio} 
                onChange={e => setProfile({...profile, bio: e.target.value})} 
                className={cn(inputClass, "resize-none")} 
              />
            </div>
          </div>
        </div>

        {/* Projects & Links */}
        <div className="xl:col-span-2 space-y-6">
          
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
             <div className="flex items-center justify-between pb-3 border-b border-[#44403c]">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <FolderKanban className="w-5 h-5 text-yellow-400" />
                 Projects Context
               </h2>
               <button 
                  onClick={() => setProjects([...projects, { id: Date.now(), title: '', description: '', tech: '', link: '' }])}
                  className="text-sm font-medium text-yellow-400 hover:text-indigo-300 flex items-center gap-1 bg-yellow-500/10 px-3 py-1.5 rounded-lg"
               >
                 <Plus className="w-4 h-4" /> Add Project
               </button>
             </div>

             <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div key={proj.id} className="bg-[#1c1917] border border-[#44403c] rounded-xl p-4 relative group">
                    <button 
                      onClick={() => setProjects(projects.filter(p => p.id !== proj.id))}
                      className="absolute top-4 right-4 text-stone-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 z-10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Changed to proj.title */}
                      <div>
                         <label className={cn(labelClass, "text-xs")}>Project Title</label>
                         <input type="text" value={proj.title} onChange={e => {
                           const newProj = [...projects];
                           newProj[idx].title = e.target.value;
                           setProjects(newProj);
                         }} className={cn(inputClass, "py-1.5 text-sm")} />
                      </div>

                      {/* Added Link field based on your JSON */}
                      <div>
                         <label className={cn(labelClass, "text-xs")}>Live Link / GitHub</label>
                         <input type="text" value={proj.link} onChange={e => {
                           const newProj = [...projects];
                           newProj[idx].link = e.target.value;
                           setProjects(newProj);
                         }} className={cn(inputClass, "py-1.5 text-sm")} placeholder="https://" />
                      </div>

                      <div className="md:col-span-2">
                         <label className={cn(labelClass, "text-xs")}>Technologies Used (comma separated)</label>
                         <input type="text" value={proj.tech} onChange={e => {
                           const newProj = [...projects];
                           newProj[idx].tech = e.target.value;
                           setProjects(newProj);
                         }} className={cn(inputClass, "py-1.5 text-sm")} placeholder="React, Node.js, Stripe API" />
                      </div>

                      <div className="md:col-span-2">
                         <label className={cn(labelClass, "text-xs")}>Description / Impact</label>
                         <textarea rows={2} value={proj.description} onChange={e => {
                           const newProj = [...projects];
                           newProj[idx].description = e.target.value;
                           setProjects(newProj);
                         }} className={cn(inputClass, "py-1.5 text-sm resize-none")} />
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
             <div className="flex items-center justify-between pb-3 border-b border-[#44403c]">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <LinkIcon className="w-5 h-5 text-amber-400" />
                 Portfolio & Social Links
               </h2>
               <button 
                  onClick={() => setLinks([...links, { id: Date.now(), name: '', url: '' }])}
                  className="text-sm font-medium text-amber-400 hover:text-blue-300 flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-lg"
               >
                 <Plus className="w-4 h-4" /> Add Link
               </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {links.map((link, idx) => (
                  <div key={link.id} className="bg-[#1c1917] border border-[#44403c] rounded-xl p-4 flex gap-3 relative group">
                    <button 
                      onClick={() => setLinks(links.filter(l => l.id !== link.id))}
                      className="absolute top-2 right-2 text-stone-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className={cn(labelClass, "text-xs")}>Link Label</label>
                        <input type="text" value={link.name} onChange={e => {
                          const newLinks = [...links];
                          newLinks[idx].name = e.target.value;
                          setLinks(newLinks);
                        }} className={cn(inputClass, "py-1.5 text-sm")} placeholder="e.g. GitHub" />
                      </div>
                      <div>
                        <label className={cn(labelClass, "text-xs")}>URL</label>
                        <input type="url" value={link.url} onChange={e => {
                          const newLinks = [...links];
                          newLinks[idx].url = e.target.value;
                          setLinks(newLinks);
                        }} className={cn(inputClass, "py-1.5 text-sm")} placeholder="https://" />
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}