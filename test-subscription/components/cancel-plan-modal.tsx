'use client';

import { useState } from 'react';
import { AlertTriangle, X, CheckCircle2 } from 'lucide-react';

interface CancelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
}

const CANCEL_REASONS = [
  "It's too expensive",
  'I only needed it for a short-term project',
  'I found an alternative service',
  "I'm not using it enough",
  'Technical or performance issues',
  'Other reasons',
];

export function CancelPlanModal({
  isOpen,
  onClose,
  onConfirm,
  planName,
}: CancelPlanModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [step, setStep] = useState<'feedback' | 'success'>('feedback');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirm();
      setStep('success');
    }, 600);
  };

  const handleClose = () => {
    setStep('feedback');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      data-testid="cancel-plan-dialog"
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Cancel your plan</h2>
              <p className="text-xs text-gray-500">{planName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {step === 'feedback' ? (
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-1">
              <div className="font-semibold">Before you cancel:</div>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                <li>You will lose access to 20+ Creative Cloud apps on renewal.</li>
                <li>Your cloud storage will be downgraded to 2GB.</li>
                <li>Any unsaved cloud document versions may become inaccessible.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 block">
                Please tell us why you are cancelling:
              </label>
              <div className="space-y-2">
                {CANCEL_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center space-x-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                      selectedReason === reason
                        ? 'border-[#0265DC] bg-blue-50/50 text-gray-900 font-medium'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={reason}
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="text-[#0265DC] focus:ring-[#0265DC]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Keep my plan
              </button>
              <button
                type="button"
                id="confirm-cancel"
                data-testid="confirm-cancel-btn"
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-[#EB1000] hover:bg-red-700 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Cancelling...' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Plan Cancelled</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Your subscription to {planName} has been cancelled. You will retain access until the end of your billing cycle.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={handleClose}
                className="px-6 py-2 rounded-full text-sm font-semibold bg-gray-900 text-white hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
