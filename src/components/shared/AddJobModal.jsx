import React, { useState } from 'react';
import { X } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export default function AddJobModal({ isOpen, onClose, onCreated }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    budget: '',
    connectsCost: '',
    status: 'submitted', // Default to 'submitted'
    clientRate: '',
    clientRegion: '',
    isClientVerified: false,
    amountSpent: '',
    clientAge: '',
    clientStars: '',
    description: '',
    proposal: '',
    jobPostedDate: new Date().toISOString().split('T')[0] // YYYY-MM-DD format for input
  });

  if (!isOpen) return null;

  // Utility to extract numbers from strings (e.g. "$45/hr" -> 45)
  const extractNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // PERFECTLY MAP FRONTEND STATE TO NESTED MONGOOSE SCHEMA
    const payload = {
      title: formData.title,
      status: formData.status,
      jobDetails: {
        description: formData.description,
        connectsCost: parseInt(formData.connectsCost) || 0,
        jobPostedDate: formData.jobPostedDate,
      },
      clientInfo: {
        region: formData.clientRegion,
        hireRate: extractNumber(formData.clientRate),
        totalSpent: extractNumber(formData.amountSpent),
        memberSince: formData.clientAge,
        rating: extractNumber(formData.clientStars),
        isPaymentVerified: formData.isClientVerified,
      },
      budget: {
        amount: extractNumber(formData.budget),
        type: String(formData.budget).includes('hr') ? 'hourly' : 'fixed',
      },
      submissionDate: new Date().toISOString(),
      proposalText: formData.proposal 
    };

    try {
      const response = await apiFetch(`/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Reset form
        setFormData({
          title: '', budget: '', connectsCost: '', status: 'submitted',
          clientRate: '', clientRegion: '', isClientVerified: false,
          amountSpent: '', clientAge: '', clientStars: '', description: '', 
          proposal: '', jobPostedDate: new Date().toISOString().split('T')[0]
        });
        onCreated?.(data.data);
        onClose(); 
      } else {
        alert('Failed to save job: ' + (data.message || data.error));
      }
    } catch (error) {
      console.error('Error submitting new job:', error);
      alert('Network error while saving job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const inputClass = "w-full bg-[#1c1917] text-white border border-[#44403c] rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-stone-500";
  const labelClass = "block text-sm font-medium text-stone-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0c0a09]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#292524] rounded-2xl shadow-2xl border border-[#44403c] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#44403c] bg-[#1c1917]">
          <h2 className="text-xl font-bold text-white tracking-tight">Add New Job Application</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-2 -mr-2 text-stone-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <form id="add-job-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={labelClass}>Job Title</label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Connects Cost</label>
                <input required type="number" name="connectsCost" value={formData.connectsCost} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Response Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className={`${inputClass} appearance-none cursor-pointer`}>
                  <option value="draft">Draft (Not Sent)</option>
                  <option value="submitted">Submitted (Sent)</option>
                  <option value="viewed">Client Viewed</option>
                  <option value="responded">Got Response</option>
                  <option value="won">Job Won!</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Job Budget</label>
                <input type="text" name="budget" value={formData.budget} onChange={handleChange} className={inputClass} placeholder="e.g. 1500 or 50/hr" />
              </div>

              <div>
                <label className={labelClass}>Job Posted Date</label>
                <input required type="date" name="jobPostedDate" value={formData.jobPostedDate} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Location / Region</label>
                <input type="text" name="clientRegion" value={formData.clientRegion} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Avg. Rate</label>
                <input type="text" name="clientRate" value={formData.clientRate} onChange={handleChange} className={inputClass} placeholder="Numbers only (e.g. 45)" />
              </div>

              <div>
                <label className={labelClass}>Client Amount Spent</label>
                <input type="text" name="amountSpent" value={formData.amountSpent} onChange={handleChange} className={inputClass} placeholder="Numbers only (e.g. 10000)" />
              </div>

              <div>
                <label className={labelClass}>Client History / Age</label>
                <input type="text" name="clientAge" value={formData.clientAge} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Stars (0-5)</label>
                <input type="number" step="0.1" min="0" max="5" name="clientStars" value={formData.clientStars} onChange={handleChange} className={inputClass} />
              </div>

              <div className="md:col-span-2 flex items-center mt-2 p-4 bg-[#1c1917] rounded-xl border border-[#44403c]">
                <input type="checkbox" id="isClientVerified" name="isClientVerified" checked={formData.isClientVerified} onChange={handleChange} className="w-5 h-5 rounded border-[#44403c] bg-[#292524] text-amber-500 focus:ring-amber-500/50" />
                <label htmlFor="isClientVerified" className="ml-3 text-white font-medium cursor-pointer">Client Payment is Verified</label>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Full Job Description</label>
                <textarea required name="description" value={formData.description} onChange={handleChange} rows={5} className={`${inputClass} resize-y`} />
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>My Submitted Proposal</label>
                <textarea required name="proposal" value={formData.proposal} onChange={handleChange} rows={4} className={`${inputClass} resize-y`} />
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-[#44403c] bg-[#1c1917] flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 rounded-xl font-medium text-stone-300 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
          <button type="submit" form="add-job-form" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-amber-500/20">{isSubmitting ? 'Saving...' : 'Add Job'}</button>
        </div>
      </div>
    </div>
  );
}
