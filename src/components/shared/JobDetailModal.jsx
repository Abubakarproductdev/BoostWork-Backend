import React from 'react';
import { BadgeCheck, CalendarClock, Coins, FileText, MapPin, Pencil, ScrollText, ShieldAlert, Star, Wallet } from 'lucide-react';
import { statusMeta } from '../../lib/proposalStatus';
import { Badge, Button, Modal } from '../ui';

const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null);

function Fact({ icon: Icon, tone, label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-line p-3.5">
      <p className="text-xs text-ink-3 flex items-center gap-1.5"><Icon className={`w-3.5 h-3.5 ${tone}`} />{label}</p>
      <p className="font-semibold text-ink mt-1 truncate">{value}</p>
    </div>
  );
}

export default function JobDetailModal({ job, onClose, onEdit }) {
  if (!job) return null;
  const meta = statusMeta(job.status);
  const timeline = [
    ['Submitted', formatDate(job.submissionDate)],
    ['Viewed', formatDate(job.viewedDate)],
    ['Responded', formatDate(job.responseDate)],
    ['Hired', formatDate(job.hiredDate)],
  ].filter(([, date]) => date);

  return (
    <Modal
      open
      onClose={onClose}
      title={job.title}
      subtitle={<div className="flex flex-wrap items-center gap-2"><Badge tone={meta.tone} dot>{meta.label}</Badge>
        {typeof job.finalEarnings === 'number' && <Badge tone="lagoon">Earned ${job.finalEarnings.toLocaleString()}</Badge>}</div>}
      footer={onEdit && <Button variant="secondary" icon={Pencil} onClick={onEdit}>Edit</Button>}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Fact icon={Wallet} tone="text-lagoon" label="Budget" value={job.budgetDisplay !== 'N/A' ? `$${job.budgetDisplay}` : 'Not set'} />
          <Fact icon={Coins} tone="text-sunbeam-ink" label="Connects" value={job.connectsCost || 0} />
          <Fact icon={MapPin} tone="text-sunbeam-ink" label="Client region" value={job.clientRegion || 'Unknown'} />
          <Fact icon={Star} tone="text-sunbeam-ink" label="Client rating" value={job.clientInfo?.rating ? `${job.clientInfo.rating} / 5` : 'N/A'} />
          <Fact icon={Wallet} tone="text-sky" label="Client spent" value={job.amountSpent ? `$${Number(job.amountSpent).toLocaleString()}` : 'Unknown'} />
          <Fact icon={BadgeCheck} tone="text-ultraviolet" label="Hire rate" value={job.clientRate ? `${job.clientRate}%` : 'N/A'} />
          <Fact icon={CalendarClock} tone="text-ink-3" label="Member since" value={job.clientAge || 'Unknown'} />
          <Fact icon={job.isClientVerified ? BadgeCheck : ShieldAlert} tone={job.isClientVerified ? 'text-lagoon' : 'text-sunbeam-ink'} label="Payment" value={job.isClientVerified ? 'Verified' : 'Unverified'} />
        </div>

        <div>
          <p className="eyebrow mb-2">Timeline</p>
          {timeline.length ? (
            <ol className="flex flex-wrap gap-2">
              {timeline.map(([label, date]) => (
                <li key={label} className="text-sm rounded-xl bg-surface-2 border border-line px-3 py-1.5"><span className="text-ink-3">{label}</span> <span className="font-semibold text-ink">{date}</span></li>
              ))}
            </ol>
          ) : <p className="text-sm text-ink-3">Not sent yet.</p>}
        </div>

        <section>
          <h3 className="font-semibold text-ink flex items-center gap-2 mb-2"><ScrollText className="w-4 h-4 text-sky" />Job description</h3>
          <div className="rounded-2xl bg-surface-2 border border-line p-4 text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">{job.description || 'No description provided.'}</div>
        </section>

        <section>
          <h3 className="font-semibold text-ink flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-sunbeam-ink" />Proposal</h3>
          <div className="rounded-2xl border border-sunbeam bg-sunbeam-soft p-4 text-sm text-ink leading-relaxed whitespace-pre-wrap">{job.proposal || 'No proposal text recorded.'}</div>
        </section>
      </div>
    </Modal>
  );
}
