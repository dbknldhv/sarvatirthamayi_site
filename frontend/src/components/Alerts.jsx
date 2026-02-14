import React from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTrashAlt, FaTimes } from 'react-icons/fa';

/**
 * SUCCESS MODAL - Used for successful creation/updates
 */
export const SuccessModal = ({ isOpen, message, onClose, onAction, actionText = "Go to List" }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Awesome!</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <div className="space-y-2">
            <button onClick={onAction} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
              {actionText}
            </button>
            <button onClick={onClose} className="w-full py-3 text-gray-400 hover:text-gray-600 font-medium transition-colors">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * CONFIRM MODAL - Specifically for Deletions
 */
export const ConfirmDeleteModal = ({ isOpen, title, onClose, onConfirm, loading }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
              <FaTrashAlt size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Confirm Delete</h3>
              <p className="text-xs text-gray-500 italic">{title}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this record? This action is permanent and cannot be reversed.</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-200">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-lg shadow-red-100">
              {loading ? "Deleting..." : "Delete Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * ERROR ALERT - Toast style warning
 */
export const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div className="fixed top-5 right-5 z-[1000] flex items-center gap-3 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-lg animate-in slide-in-from-right duration-300">
      <FaExclamationTriangle className="text-red-500" />
      <p className="text-sm font-medium text-red-800">{message}</p>
      <button onClick={onClose} className="ml-4 text-red-400 hover:text-red-600"><FaTimes /></button>
    </div>
  );
};