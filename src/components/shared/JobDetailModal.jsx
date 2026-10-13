import React from 'react';
import { X, CheckCircle2, ShieldAlert, Star, MapPin, DollarSign, Clock, FileText, LayoutList } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function JobDetailModal({ job, onClose }) {
  if (!job) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-[#0c0a09]/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#292524] rounded-2xl shadow-2xl border border-[#44403c] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#44403c] bg-[#1c1917]">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
            Job Details
            <span className={cn(
              "text-xs px-2.5 py-1 rounded-full font-semibold border",
              job.status === 'response' ? "bg-green-500/10 text-green-400 border-green-500/30" : 
              job.status === 'view' ? "bg-red-500/10 text-red-400 border-red-500/30" : 
              "bg-amber-500/10 text-amber-400 border-amber-500/30"
            )}>
              {job.status === 'response' ? 'Responded' : job.status === 'view' ? 'Viewed' : 'Applied'}
            </span>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scroll-smooth space-y-8 text-stone-300">
          
          {/* Header section */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-stone-400">
              <div className="flex items-center gap-1.5 font-medium text-stone-300">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                {job.budgetDisplay || 'N/A'}
              </div>
              <div className="flex items-center gap-1.5 font-medium text-stone-300">
                <div className="bg-amber-500/20 text-amber-400 px-2 rounded-md font-bold">{job.connectsCost || 0} Connects</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-stone-500" />
                Applied {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <hr className="border-[#44403c]" />

          {/* Client Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" fill="currentColor" /> 
              Client Overview
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 bg-[#1c1917] p-5 rounded-xl border border-[#44403c]">
              
              <div>
                <p className="text-xs text-stone-500 mb-1">Region</p>
                <div className="font-semibold text-white flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  {job.clientRegion || 'Unknown'}
                </div>
              </div>
              
              <div>
                <p className="text-xs text-stone-500 mb-1">Spent</p>
                <div className="font-semibold text-white">
                  {job.amountSpent || '$0'}
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 mb-1">Avg Rate</p>
                <div className="font-semibold text-white">
                  {job.clientRate || 'N/A'}
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 mb-1">Member Since</p>
                <div className="font-semibold text-white">
                  {job.clientAge || 'New'}
                </div>
              </div>

              <div>
                <p className="text-xs text-stone-500 mb-1">Verification</p>
                <div className="font-semibold flex items-center gap-1">
                  {job.isClientVerified ? (
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Unverified</span>
                  )}
                </div>
              </div>
              
            </div>
          </div>

          {/* Job Description */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <LayoutList className="w-5 h-5 text-yellow-400" /> 
              Job Description
            </h3>
            <div className="bg-[#1c1917] p-5 rounded-xl border border-[#44403c] whitespace-pre-wrap leading-relaxed text-sm">
              {job.description || 'No description provided.'}
            </div>
          </div>

          {/* Proposal */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" /> 
              My Proposal
            </h3>
            <div className="bg-[#1c1917] p-5 rounded-xl border border-[#44403c] whitespace-pre-wrap leading-relaxed text-sm border-l-4 border-l-purple-500">
              {job.proposal || 'No proposal documented.'}
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
