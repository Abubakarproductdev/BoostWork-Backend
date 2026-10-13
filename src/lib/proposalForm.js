// Conversion between the flat proposal form and the nested API/Mongoose shape.

const todayInputValue = () => new Date().toISOString().split('T')[0];

const toInputDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

/** "$1,500" -> 1500, "45/hr" -> 45, "" -> null (null clears the stored value). */
export const parseAmount = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isNaN(number) ? null : number;
};

export const EMPTY_FORM = {
  title: '',
  status: 'submitted',
  description: '',
  connectsCost: '',
  jobPostedDate: '',
  submissionDate: '',
  budget: '',
  clientRegion: '',
  clientRate: '',
  amountSpent: '',
  clientAge: '',
  clientStars: '',
  isClientVerified: false,
  finalEarnings: '',
  proposal: '',
};

export const newProposalForm = () => ({
  ...EMPTY_FORM,
  jobPostedDate: todayInputValue(),
  submissionDate: todayInputValue(),
});

/** Stored proposal -> form fields. */
export const proposalToForm = (job) => ({
  title: job?.title || '',
  status: job?.status || 'submitted',
  description: job?.jobDetails?.description || '',
  connectsCost: job?.jobDetails?.connectsCost ?? '',
  jobPostedDate: toInputDate(job?.jobDetails?.jobPostedDate),
  submissionDate: toInputDate(job?.submissionDate),
  // Keep "/hr" so saving doesn't silently turn an hourly budget into a fixed one
  budget: job?.budget?.amount != null ? `${job.budget.amount}${job.budget.type === 'hourly' ? '/hr' : ''}` : '',
  clientRegion: job?.clientInfo?.region || '',
  clientRate: job?.clientInfo?.hireRate ?? '',
  amountSpent: job?.clientInfo?.totalSpent ?? '',
  clientAge: job?.clientInfo?.memberSince || '',
  clientStars: job?.clientInfo?.rating ?? '',
  isClientVerified: Boolean(job?.clientInfo?.isPaymentVerified),
  finalEarnings: job?.finalEarnings ?? '',
  proposal: job?.proposalText || '',
});

/** Form fields -> API payload. Only sent fields change on the server (persona etc. are kept). */
export const formToPayload = (form) => {
  const budgetAmount = parseAmount(form.budget);
  const payload = {
    title: form.title.trim(),
    status: form.status,
    jobDetails: {
      description: form.description,
      connectsCost: parseAmount(form.connectsCost),
      jobPostedDate: form.jobPostedDate || todayInputValue(),
    },
    clientInfo: {
      region: form.clientRegion,
      hireRate: parseAmount(form.clientRate),
      totalSpent: parseAmount(form.amountSpent),
      memberSince: form.clientAge,
      rating: parseAmount(form.clientStars),
      isPaymentVerified: form.isClientVerified,
    },
    budget: {
      amount: budgetAmount,
      type: /hr|hour/i.test(String(form.budget)) ? 'hourly' : 'fixed',
    },
    finalEarnings: form.status === 'won' ? parseAmount(form.finalEarnings) : null,
    proposalText: form.proposal,
  };

  // Drafts have no submission date; the server records one when the status changes if none is given.
  if (form.status !== 'draft' && form.submissionDate) {
    payload.submissionDate = form.submissionDate;
  }

  return payload;
};
