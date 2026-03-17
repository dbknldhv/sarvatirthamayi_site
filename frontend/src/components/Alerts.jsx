import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  X, 
  AlertCircle 
} from 'lucide-react'; // Switched to Lucide for a cleaner, professional look

/**
 * SUCCESS MODAL - Professional variant
 */
export const SuccessModal = ({ isOpen, message, onClose, onAction, actionText = "Continue" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Glassmorphism Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full relative z-10 overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle2 size={48} strokeWidth={1.5} />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2 italic tracking-tight">Success!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8 px-4 leading-relaxed">
            {message}
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={onAction} 
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              {actionText}
            </button>
            <button 
              onClick={onClose} 
              className="w-full py-4 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-[10px] uppercase tracking-widest transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * CONFIRM DELETE MODAL - Professional variant
 */
export const ConfirmDeleteModal = ({ isOpen, title, onClose, onConfirm, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={onClose} />
      
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full relative z-10 border border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-300">
        <div className="p-8">
          <div className="flex items-center gap-5 mb-6">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-lg tracking-tight uppercase">Delete Record?</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[180px]">{title}</p>
            </div>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
            This action is permanent and will remove all associated data from the divine archives. Are you absolutely sure?
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm} 
              disabled={loading} 
              className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ERROR ALERT - Floating Toast Style
 */
export const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-8 right-8 z-[1000] max-w-md w-full sm:w-auto">
      <div className="bg-white dark:bg-slate-900 border-l-4 border-rose-500 p-5 rounded-2xl shadow-2xl shadow-rose-500/10 flex items-center gap-4 animate-in slide-in-from-right-10 duration-500">
        <div className="bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg text-rose-500">
          <AlertCircle size={20} />
        </div>
        
        <div className="flex-1">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Alert</p>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-tight">{message}</p>
        </div>
        
        <button 
          onClick={onClose} 
          className="p-2 text-slate-300 hover:text-slate-600 dark:hover:text-slate-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};