import React, { useState } from 'react';
import { apiFetch } from '../../lib/api';
import { statusMeta, STATUS_OPTIONS } from '../../lib/proposalStatus';
import { formToPayload, newProposalForm, proposalToForm } from '../../lib/proposalForm';
import { cn } from '../../lib/utils';
import { Button, Modal, TONES } from '../ui';

function Section({ title, children }) {
  return (
    <section>
      <p className="eyebrow mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function Field({ label, wide, children }) {
  return (
    <label className={cn('block', wide && 'sm:col-span-2')}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/**
 * Create or edit a proposal. Pass `job` to edit; omit it to create.
 * Calls onSaved(savedProposal) after the server confirms the change.
 */
export default function ProposalFormModal({ job, onClose, onSaved }) {
  const isEdit = Boolean(job);
  const [formData, setFormData] = useState(() => (isEdit ? proposalToForm(job) : newProposalForm()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiFetch(isEdit ? `/api/proposals/${job._id}` : '/api/proposals', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(formToPayload(formData)),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || data.error || 'Failed to save the proposal.');
      onSaved(data.data);
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSent = formData.status !== 'draft';

  return (
    <Modal
      open
      onClose={onClose}
      busy={isSubmitting}
      title={isEdit ? 'Edit proposal' : 'Add a proposal'}
      subtitle={<p className="text-sm text-ink-2">{isEdit ? 'Update the details or move it along your pipeline.' : 'Log a job you applied to (or plan to).'}</p>}
      footer={(
        <>
          {error && <p className="mr-auto text-sm text-danger">{error}</p>}
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="proposal-form" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Add proposal'}</Button>
        </>
      )}
    >
      <form id="proposal-form" onSubmit={handleSubmit} className="space-y-7">
        <div>
          <p className="eyebrow mb-3">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => {
              const meta = statusMeta(option.value);
              const active = formData.status === option.value;
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => setFormData((prev) => ({ ...prev, status: option.value }))}
                  className={cn('h-9 px-3.5 rounded-xl text-sm font-semibold border transition-all flex items-center gap-2',
                    active ? cn(TONES[meta.tone].soft, 'ring-2', TONES[meta.tone].ring) : 'border-line bg-surface-2 text-ink-2 hover:text-ink')}
                >
                  <span className={cn('w-2 h-2 rounded-full', TONES[meta.tone].dot)} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <Section title="The job">
          <Field label="Job title" wide>
            <input required minLength={3} maxLength={200} type="text" name="title" value={formData.title} onChange={handleChange} className="field" />
          </Field>
          <Field label="Budget">
            <input type="text" name="budget" value={formData.budget} onChange={handleChange} className="field" placeholder="1500 or 50/hr" />
          </Field>
          <Field label="Connects spent">
            <input type="number" min="0" name="connectsCost" value={formData.connectsCost} onChange={handleChange} className="field" />
          </Field>
          <Field label="Job posted">
            <input required type="date" name="jobPostedDate" value={formData.jobPostedDate} onChange={handleChange} className="field" />
          </Field>
          {isSent && (
            <Field label="Submitted on">
              <input type="date" name="submissionDate" value={formData.submissionDate} onChange={handleChange} className="field" />
            </Field>
          )}
          {formData.status === 'won' && (
            <Field label="Final earnings (confirmed)">
              <input type="text" name="finalEarnings" value={formData.finalEarnings} onChange={handleChange} className="field" placeholder="Amount actually earned" />
            </Field>
          )}
          <Field label="Job description" wide>
            <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className="field resize-y" />
          </Field>
        </Section>

        <Section title="The client">
          <Field label="Location / region">
            <input type="text" name="clientRegion" value={formData.clientRegion} onChange={handleChange} className="field" />
          </Field>
          <Field label="Member since">
            <input type="text" name="clientAge" value={formData.clientAge} onChange={handleChange} className="field" />
          </Field>
          <Field label="Hire rate (%)">
            <input type="text" name="clientRate" value={formData.clientRate} onChange={handleChange} className="field" placeholder="e.g. 75" />
          </Field>
          <Field label="Total spent">
            <input type="text" name="amountSpent" value={formData.amountSpent} onChange={handleChange} className="field" placeholder="e.g. 10000" />
          </Field>
          <Field label="Rating (0-5)">
            <input type="number" step="0.1" min="0" max="5" name="clientStars" value={formData.clientStars} onChange={handleChange} className="field" />
          </Field>
          <label className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 px-4 h-[46px] self-end cursor-pointer">
            <input type="checkbox" name="isClientVerified" checked={formData.isClientVerified} onChange={handleChange} className="w-4 h-4 accent-[var(--lagoon)]" />
            <span className="text-sm font-medium text-ink">Payment verified</span>
          </label>
        </Section>

        <section>
          <p className="eyebrow mb-3">Your proposal</p>
          <textarea name="proposal" value={formData.proposal} onChange={handleChange} rows={6} className="field resize-y" placeholder="The proposal you sent (optional)" />
        </section>
      </form>
    </Modal>
  );
}
