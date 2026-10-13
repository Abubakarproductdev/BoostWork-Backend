import React, { useMemo, useState } from 'react';
import { Coins, MapPin, Pencil, Plus, Rows3, Search, Trash2, Wallet } from 'lucide-react';
import ProposalFormModal from '../components/shared/ProposalFormModal';
import JobDetailModal from '../components/shared/JobDetailModal';
import { useJobContext } from '../context/JobContext';
import { apiFetch } from '../lib/api';
import { statusMeta, STATUS_OPTIONS } from '../lib/proposalStatus';
import { cn } from '../lib/utils';
import { Badge, Button, Card, EmptyState, IconButton, PageHeader, TONES } from '../components/ui';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);

export default function ProposalPerformance() {
  const { jobs, isLoading, addJob, updateJob, removeJob } = useJobContext();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(() => jobs.reduce((acc, job) => ({ ...acc, [job.status]: (acc[job.status] || 0) + 1 }), {}), [jobs]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => (filter === 'all' || job.status === filter)
      && (!q || job.title?.toLowerCase().includes(q) || job.description?.toLowerCase().includes(q)));
  }, [jobs, filter, query]);

  const handleDelete = async (job) => {
    if (!window.confirm(`Delete "${job.title}"? This can't be undone.`)) return;
    setDeletingId(job._id);
    try {
      const response = await apiFetch(`/api/proposals/${job._id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Failed to delete the proposal.');
      removeJob(job._id);
    } catch (error) {
      alert(error.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title="Every proposal,"
        highlight="in one place"
        description="Log what you send, update the status as clients respond, and the dashboard does the math."
        actions={<Button size="lg" icon={Plus} onClick={() => setIsAddModalOpen(true)}>Add proposal</Button>}
      />

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 [scrollbar-width:none]">
          {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map((option) => {
            const count = option.value === 'all' ? jobs.length : counts[option.value] || 0;
            const tone = option.value === 'all' ? 'flamingo' : statusMeta(option.value).tone;
            const active = filter === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={cn('h-9 px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap border transition-all flex items-center gap-2',
                  active ? cn(TONES[tone].soft, 'shadow-sm') : 'border-line bg-surface text-ink-2 hover:text-ink')}
              >
                {option.value === 'all' ? 'All' : statusMeta(option.value).label}
                <span className={cn('text-xs rounded-md px-1.5', active ? 'bg-surface' : 'bg-surface-2 text-ink-3')}>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:ml-auto lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search proposals" className="field pl-10 h-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
      ) : !jobs.length ? (
        <Card>
          <EmptyState icon={Rows3} tone="sky" title="No proposals yet"
            action={<Button icon={Plus} onClick={() => setIsAddModalOpen(true)}>Add your first proposal</Button>}>
            Add proposals you've sent, or save one from the AI Writer, to start tracking your pipeline.
          </EmptyState>
        </Card>
      ) : !visible.length ? (
        <Card><EmptyState icon={Search} title="Nothing matches">Try a different filter or search.</EmptyState></Card>
      ) : (
        <ul className="grid gap-3">
          {visible.map((job, index) => {
            const meta = statusMeta(job.status);
            const sentOn = job.status !== 'draft' ? formatDate(job.submissionDate) : null;
            return (
              <li key={job._id} className="animate-rise" style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}>
                <Card
                  as="div"
                  onClick={() => setSelectedJob(job)}
                  className="group relative p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:border-line-strong overflow-hidden"
                >
                  <span className={cn('absolute left-0 top-0 bottom-0 w-1', TONES[meta.tone].dot)} />
                  <div className="min-w-0 flex-1 pl-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <Badge tone={meta.tone} dot>{meta.label}</Badge>
                      <span className="text-xs text-ink-3">{sentOn ? `Sent ${sentOn}` : `Created ${formatDate(job.createdAt) || ''}`}</span>
                    </div>
                    <p className="font-semibold text-ink truncate">{job.title}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-ink-2">
                      {job.budgetDisplay !== 'N/A' && <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5 text-lagoon" />${job.budgetDisplay}</span>}
                      <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-sunbeam-ink" />{job.connectsCost || 0} connects</span>
                      {job.clientRegion && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-sunbeam-ink" />{job.clientRegion}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <IconButton icon={Pencil} label="Edit proposal" onClick={() => setEditingJob(job)} />
                    <IconButton icon={Trash2} label="Delete proposal" tone="danger" disabled={deletingId === job._id} onClick={() => handleDelete(job)} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {isAddModalOpen && <ProposalFormModal onSaved={addJob} onClose={() => setIsAddModalOpen(false)} />}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onEdit={() => { setEditingJob(selectedJob); setSelectedJob(null); }} />
      {editingJob && (
        <ProposalFormModal
          key={editingJob._id}
          job={editingJob}
          onSaved={(saved) => updateJob(editingJob._id, saved)}
          onClose={() => setEditingJob(null)}
        />
      )}
    </div>
  );
}
