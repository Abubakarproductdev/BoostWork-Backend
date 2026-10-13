import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { CheckCircle2, Circle, Clock, Zap, Pencil, X } from 'lucide-react';
import AddJobModal from '../components/shared/AddJobModal';
import JobDetailModal from '../components/shared/JobDetailModal';
import { useJobContext } from '../context/JobContext';
import { apiFetch } from '../lib/api';

// --- EMBEDDED EDIT MODAL ---
const buildEditFormData = (job) => ({
  title: job?.title || '',
  status: job?.status || 'submitted',
  description: job?.jobDetails?.description || '',
  connectsCost: job?.jobDetails?.connectsCost || 0,
  jobPostedDate: job?.jobDetails?.jobPostedDate ? new Date(job.jobDetails.jobPostedDate).toISOString().split('T')[0] : '',
  clientRegion: job?.clientInfo?.region || '',
  clientRate: job?.clientInfo?.hireRate || '',
  amountSpent: job?.clientInfo?.totalSpent || '',
  clientAge: job?.clientInfo?.memberSince || '',
  clientStars: job?.clientInfo?.rating || '',
  isClientVerified: job?.clientInfo?.isPaymentVerified || false,
  budget: job?.budget?.amount || '',
  proposal: job?.proposalText || ''
});

const EditJobModal = ({ isOpen, onClose, job, onSave }) => {
  const [formData, setFormData] = useState(() => buildEditFormData(job));

  if (!isOpen || !job) return null;

  const extractNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(String(str).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // MAP FLAT FORM DATA BACK TO NESTED MONGOOSE SCHEMA FOR PUT REQUEST
    const payload = {
      title: formData.title,
      status: formData.status,
      jobDetails: {
        description: formData.description,
        connectsCost: parseInt(formData.connectsCost) || 0,
        jobPostedDate: formData.jobPostedDate || new Date().toISOString(),
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
      proposalText: formData.proposal
    };

    onSave(job._id, payload);
  };

  const inputClass = "w-full bg-[#1c1917] text-white border border-[#44403c] rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";
  const labelClass = "block text-sm font-medium text-stone-400 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0c0a09]/80 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#292524] rounded-2xl shadow-2xl border border-[#44403c] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#44403c] bg-[#1c1917]">
          <h2 className="text-xl font-bold text-white tracking-tight">Edit Proposal Details</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <form id="edit-job-form" onSubmit={handleSubmit} className="space-y-6">
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
                <input type="text" name="budget" value={formData.budget} onChange={handleChange} className={inputClass} />
              </div>
              
              <div>
                <label className={labelClass}>Job Posted Date</label>
                <input type="date" name="jobPostedDate" value={formData.jobPostedDate} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Location / Region</label>
                <input type="text" name="clientRegion" value={formData.clientRegion} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Avg. Rate</label>
                <input type="text" name="clientRate" value={formData.clientRate} onChange={handleChange} className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Client Amount Spent</label>
                <input type="text" name="amountSpent" value={formData.amountSpent} onChange={handleChange} className={inputClass} />
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
                <input 
                  type="checkbox" 
                  id="editIsClientVerified" 
                  name="isClientVerified" 
                  checked={formData.isClientVerified} 
                  onChange={handleChange} 
                  className="w-5 h-5 rounded border-[#44403c] bg-[#292524] text-amber-500 focus:ring-amber-500/50"
                />
                <label htmlFor="editIsClientVerified" className="ml-3 text-white font-medium cursor-pointer">
                  Client Payment is Verified
                </label>
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
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-stone-300 hover:text-white hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="submit" form="edit-job-form" className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-amber-500/20">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END EMBEDDED EDIT MODAL ---


// --- MAIN PAGE COMPONENT ---
export default function ProposalPerformance() {
  const { jobs, isLoading, addJob, updateJob } = useJobContext();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  // PUT: Update job
  const handleUpdateJob = async (id, updatedData) => {
    try {
      const response = await apiFetch(`/api/proposals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        updateJob(id, data.data);
        setEditingJob(null);
      } else {
        alert('Failed to update job: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating proposal:', error);
      alert('Network error while updating job.');
    }
  };

  // UI Helpers mapped to new Schema Statuses
  const getStatusColor = (status) => {
    switch(status) {
      case 'won': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]';
      case 'responded': return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]';
      case 'viewed': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      case 'submitted': return 'bg-amber-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]';
      default: return 'bg-stone-500';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'won': return 'Job Won!';
      case 'responded': return 'Responded';
      case 'viewed': return 'Viewed';
      case 'submitted': return 'Submitted';
      case 'draft': return 'Draft';
      default: return 'Unknown';
    }
  };

  const truncateTitle = (title) => {
    if (!title) return '';
    const words = title.split(' ');
    if (words.length <= 3) return title;
    return words.slice(0, 3).join(' ') + '...';
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Proposal Performance</h1>
          <p className="text-stone-400 mt-1">Track and manage your submitted proposals</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          <span>Add Job</span>
        </button>
      </div>

      <div className="glass-panel rounded-2xl flex-1 overflow-hidden flex flex-col border border-white/10">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#292524] bg-[#1c1917]/80 text-xs font-semibold text-stone-400 uppercase tracking-wider">
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-4">Job Title</div>
          <div className="col-span-2 text-center">Connects</div>
          <div className="col-span-2 text-center">Completion</div>
          <div className="col-span-2 text-right">Applied</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-full text-stone-500">
               <p>Loading proposals...</p>
             </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-500">
              <p>No jobs added yet.</p>
            </div>
          ) : (
            jobs.map(job => (
              <div 
                key={job._id} 
                onClick={() => setSelectedJob(job)}
                className="grid grid-cols-12 gap-4 px-4 py-4 items-center rounded-xl hover:bg-[#292524]/60 cursor-pointer transition-colors border border-transparent hover:border-[#44403c]/50 group relative"
              >
                <div className="col-span-2 flex justify-center">
                  <div className="relative group/tooltip">
                    <div className={cn("w-3.5 h-3.5 rounded-full transition-all duration-300", getStatusColor(job.status))} />
                    <div className="absolute left-1/2 -top-8 -translate-x-1/2 bg-[#1c1917] text-xs text-white px-2 py-1 rounded border border-[#44403c] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {getStatusText(job.status)}
                    </div>
                  </div>
                </div>
                
                <div className="col-span-4 font-medium text-stone-200 group-hover:text-white transition-colors">
                  {truncateTitle(job.title)}
                </div>
                
        <div className="col-span-2 flex justify-center">
           <div className="bg-[#292524] px-3 py-1 rounded-full text-sm font-medium text-amber-400 border border-amber-500/20">
             {job.connectsCost || 0}
           </div>
        </div>
                
                <div className="col-span-2 flex justify-center items-center gap-2">
                  {job.status !== 'draft' ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Applied
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full text-xs font-semibold">
                      <Circle className="w-3.5 h-3.5 border border-amber-400 border-dashed rounded-full" />
                      Draft
                    </div>
                  )}
                </div>
                
                <div className="col-span-2 text-right text-sm text-stone-400 flex items-center justify-end gap-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {job.submissionDate ? new Date(job.submissionDate).toLocaleDateString() : 'N/A'}
                  </span>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); 
                      setEditingJob(job);
                    }}
                    className="p-1.5 hover:bg-[#44403c] text-stone-400 hover:text-amber-400 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit Proposal"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddJobModal 
        isOpen={isAddModalOpen} 
        onCreated={addJob}
        onClose={() => {
          setIsAddModalOpen(false);
        }} 
      />
      <JobDetailModal 
        job={selectedJob} 
        onClose={() => setSelectedJob(null)} 
      />
      <EditJobModal 
        key={editingJob?._id || 'edit-modal'}
        isOpen={!!editingJob} 
        job={editingJob} 
        onClose={() => setEditingJob(null)} 
        onSave={handleUpdateJob}
      />
    </div>
  );
}
