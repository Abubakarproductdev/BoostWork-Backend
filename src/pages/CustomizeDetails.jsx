import React, { useEffect, useState } from 'react';
import { Check, FolderKanban, Link2, Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import { Button, Card, IconButton, PageHeader, SectionTitle } from '../components/ui';

const newProject = () => ({ id: `new-${Date.now()}-${Math.random()}`, title: '', description: '', tech: '', link: '' });
const newLink = () => ({ id: `new-${Date.now()}-${Math.random()}`, name: '', url: '' });

/** How much a project can back up a proposal: the AI cites title, tools and description. */
const evidenceStrength = (project) => {
  const checks = [project.title.trim(), project.tech.trim(), project.description.trim().length >= 40, project.link.trim()];
  return checks.filter(Boolean).length;
};

export default function CustomizeDetails() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });
  const [profile, setProfile] = useState({ fullName: '', title: '', bio: '' });
  const [projects, setProjects] = useState([]);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        const response = await apiFetch('/api/portfolio');
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
              id: p._id || p.id || `p-${index}`,
              title: p.title || p.name || '',
              description: p.description || '',
              link: p.link || '',
              tech: Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.tech || ''),
            }))
          : [newProject()]);
        setLinks(savedLinks.length
          ? savedLinks.map((l, index) => ({ id: l._id || l.id || `l-${index}`, name: l.name || '', url: l.url || '' }))
          : [newLink()]);
      } catch (error) {
        setSaveState({ status: 'error', message: `Could not load your profile: ${error.message}` });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  const updateProject = (id, field, value) => {
    setProjects((list) => list.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    setSaveState({ status: 'idle', message: '' });
  };
  const updateLink = (id, field, value) => {
    setLinks((list) => list.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
    setSaveState({ status: 'idle', message: '' });
  };
  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaveState({ status: 'idle', message: '' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveState({ status: 'idle', message: '' });

    // Blank rows are skipped: the backend requires a project title / link name.
    const payload = {
      profile,
      projects: projects.filter((p) => p.title.trim()).map((p) => ({
        title: p.title,
        description: p.description,
        link: p.link,
        technologies: p.tech.split(',').map((item) => item.trim()).filter(Boolean),
      })),
      links: links.filter((l) => l.name.trim()).map(({ name, url }) => ({ name, url })),
    };

    try {
      const response = await apiFetch('/api/portfolio', { method: 'POST', body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to save your profile.');
      setSaveState({ status: 'saved', message: 'Saved. The AI will use this from now on.' });
    } catch (error) {
      setSaveState({ status: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-14 w-2/3" />
        <div className="grid lg:grid-cols-3 gap-5"><div className="skeleton h-80" /><div className="skeleton h-80 lg:col-span-2" /></div>
      </div>
    );
  }

  const initials = (profile.fullName || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your profile"
        title="The story the AI"
        highlight="tells about you"
        description="Everything here is the knowledge base for your proposals and reports. The AI only ever claims what's written here."
        actions={(
          <>
            {saveState.message && (
              <span className={cn('text-sm flex items-center gap-1.5', saveState.status === 'error' ? 'text-danger' : 'text-lagoon')}>
                {saveState.status === 'saved' && <Check className="w-4 h-4" />}{saveState.message}
              </span>
            )}
            <Button size="lg" icon={Save} loading={isSaving} onClick={handleSave}>Save profile</Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] gap-5 items-start">
        {/* Identity */}
        <Card className="overflow-hidden xl:sticky xl:top-28">
          <div className="h-24 bg-lagoon" />
          <div className="px-5 pb-5">
            <div className="-mt-10 mb-4 w-20 h-20 rounded-3xl bg-surface p-1.5 shadow-lg">
              <div className="w-full h-full rounded-[1.1rem] bg-sunbeam text-on-sunbeam font-display text-2xl font-bold flex items-center justify-center">{initials}</div>
            </div>
            <p className="font-display text-xl font-bold text-ink">{profile.fullName || 'Your name'}</p>
            <p className="text-sm text-sunbeam-ink font-semibold">{profile.title || 'Your professional title'}</p>

            <div className="space-y-4 mt-5">
              <div>
                <label className="label" htmlFor="fullName">Full name</label>
                <input id="fullName" value={profile.fullName} onChange={(e) => updateProfile('fullName', e.target.value)} className="field" maxLength={120} />
              </div>
              <div>
                <label className="label" htmlFor="title">Professional title</label>
                <input id="title" value={profile.title} onChange={(e) => updateProfile('title', e.target.value)} className="field" maxLength={160}
                  placeholder="e.g. React developer for logistics dashboards" />
              </div>
              <div>
                <label className="label" htmlFor="bio">Bio</label>
                <textarea id="bio" rows={7} value={profile.bio} onChange={(e) => updateProfile('bio', e.target.value)} className="field resize-y leading-relaxed" maxLength={5000}
                  placeholder="Who you help, what you deliver, and how you work." />
                <p className="text-xs text-ink-3 mt-1 text-right">{profile.bio.length}/5000</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5 min-w-0">
          {/* Projects */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={FolderKanban} tone="ultraviolet" title="Projects"
              aside={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setProjects((list) => [...list, newProject()])}>Add project</Button>} />
            <p className="text-sm text-ink-2 -mt-2 mb-4">The proposal writer picks the most relevant of these as evidence. Clear titles, tools and outcomes make them easier to match.</p>
            <ul className="space-y-3">
              {projects.map((project, index) => {
                const strength = evidenceStrength(project);
                return (
                  <li key={project.id} className="rounded-2xl border border-line bg-surface-2 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-ultraviolet-soft text-ultraviolet text-xs font-bold flex items-center justify-center">{index + 1}</span>
                        <div className="flex gap-1" title={`Evidence strength ${strength}/4`}>
                          {[0, 1, 2, 3].map((i) => <span key={i} className={cn('w-5 h-1.5 rounded-full', i < strength ? 'bg-lagoon' : 'bg-line')} />)}
                        </div>
                      </div>
                      <IconButton icon={Trash2} label="Remove project" tone="danger" onClick={() => setProjects((list) => list.filter((p) => p.id !== project.id))} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label">Title</label>
                        <input value={project.title} onChange={(e) => updateProject(project.id, 'title', e.target.value)} className="field" placeholder="Logistics tracking dashboard" />
                      </div>
                      <div>
                        <label className="label">Link</label>
                        <input value={project.link} onChange={(e) => updateProject(project.id, 'link', e.target.value)} className="field" placeholder="https://" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">Tools (comma separated)</label>
                        <input value={project.tech} onChange={(e) => updateProject(project.id, 'tech', e.target.value)} className="field" placeholder="React, Node.js, Mapbox" />
                        {project.tech.trim() && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.tech.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                              <span key={t} className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-ultraviolet-soft text-ultraviolet">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label">What you did and what changed</label>
                        <textarea rows={3} value={project.description} onChange={(e) => updateProject(project.id, 'description', e.target.value)} className="field resize-y"
                          placeholder="The problem, what you built, and the result for the client." />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Links */}
          <Card className="p-5 sm:p-6">
            <SectionTitle icon={Link2} tone="sky" title="Links"
              aside={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setLinks((list) => [...list, newLink()])}>Add link</Button>} />
            <ul className="grid md:grid-cols-2 gap-3">
              {links.map((link) => (
                <li key={link.id} className="rounded-2xl border border-line bg-surface-2 p-3.5 flex gap-2 items-start">
                  <div className="flex-1 space-y-2 min-w-0">
                    <input value={link.name} onChange={(e) => updateLink(link.id, 'name', e.target.value)} className="field h-10" placeholder="Label, e.g. GitHub" aria-label="Link label" />
                    <input type="url" value={link.url} onChange={(e) => updateLink(link.id, 'url', e.target.value)} className="field h-10" placeholder="https://" aria-label="Link URL" />
                  </div>
                  <IconButton icon={Trash2} label="Remove link" tone="danger" onClick={() => setLinks((list) => list.filter((l) => l.id !== link.id))} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
