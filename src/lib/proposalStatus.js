// Single definition of proposal statuses, matching the backend enum in models/Proposal.js.

export const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft (not sent)' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'viewed', label: 'Viewed by client' },
  { value: 'responded', label: 'Client responded' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost / declined' },
  { value: 'archived', label: 'Archived' },
];

// `tone` maps to the UI kit's accent tones (components/ui.jsx)
const STATUS_META = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'ink' },
  viewed: { label: 'Viewed', tone: 'neutral' },
  responded: { label: 'Responded', tone: 'sunbeam' },
  won: { label: 'Won', tone: 'lagoon' },
  lost: { label: 'Lost', tone: 'danger' },
  archived: { label: 'Archived', tone: 'neutral' },
};

export const statusMeta = (status) => STATUS_META[status] || { label: 'Unknown', tone: 'neutral' };
