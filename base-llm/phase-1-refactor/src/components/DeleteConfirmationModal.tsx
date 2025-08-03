import React from 'react';
import type { DeleteConfirmState } from '../types/expense';

interface DeleteConfirmationModalProps {
  deleteConfirm: DeleteConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  deleteConfirm,
  onConfirm,
  onCancel,
}) => {
  if (!deleteConfirm.isOpen || !deleteConfirm.expense) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Expense</h3>
        <p>
          Delete expense: <strong>{deleteConfirm.expense.description}</strong>? 
          This cannot be undone.
        </p>
        <div className="modal-buttons">
          <button 
            onClick={onCancel}
            className="cancel-button"
            autoFocus
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="delete-confirm-button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};