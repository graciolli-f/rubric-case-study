/**
 * Presentation component for delete confirmation dialog
 * Pure component with focus management and accessibility
 */

import React, { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Expense } from '../types/expense.types';
import './DeleteConfirmDialog.css';

/**
 * Props for DeleteConfirmDialog component
 */
export interface DeleteConfirmDialogProps {
  /** Expense to be deleted */
  expense: Expense;
  /** Callback when delete is confirmed */
  onConfirm: () => void;
  /** Callback when delete is cancelled */
  onCancel: () => void;
}

/**
 * DeleteConfirmDialog component
 */
export default React.memo(function DeleteConfirmDialog({
  expense,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps): React.JSX.Element {
  
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  
  // Focus management
  useEffect(() => {
    // Focus the cancel button when dialog opens
    if (cancelButtonRef.current) {
      cancelButtonRef.current.focus();
    }
    
    // Store the previously focused element
    const previouslyFocusedElement = document.activeElement as HTMLElement;
    
    // Return focus when dialog closes
    return () => {
      if (previouslyFocusedElement && previouslyFocusedElement.focus) {
        previouslyFocusedElement.focus();
      }
    };
  }, []);
  
  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);
  
  /**
   * Handle tab key for focus trap
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusableElements = [cancelButtonRef.current, deleteButtonRef.current].filter(Boolean);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }
  };
  
  /**
   * Handle overlay click
   */
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };
  
  return (
    <div 
      className="delete-dialog-overlay"
      onClick={handleOverlayClick}
      role="presentation"
      data-testid="dialog-overlay"
    >
      <div
        ref={dialogRef}
        className="delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onKeyDown={handleKeyDown}
        data-testid="delete-dialog"
        data-focus-trap="true"
      >
        {/* Icon */}
        <AlertTriangle 
          className="delete-dialog__icon"
          aria-hidden="true"
        />
        
        {/* Title */}
        <h2 
          id="dialog-title"
          className="delete-dialog__title"
        >
          Delete Expense
        </h2>
        
        {/* Message */}
        <p 
          id="dialog-message"
          className="delete-dialog__message"
        >
          Delete expense: <span className="delete-dialog__expense-name">{expense.description}</span>? 
          This cannot be undone.
        </p>
        
        {/* Actions */}
        <div className="delete-dialog__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="delete-dialog__button delete-dialog__button--cancel"
            onClick={onCancel}
            data-testid="cancel-button"
            aria-label="Cancel deletion"
          >
            Cancel
          </button>
          <button
            ref={deleteButtonRef}
            type="button"
            className="delete-dialog__button delete-dialog__button--delete"
            onClick={onConfirm}
            data-testid="delete-button"
            aria-label={`Delete expense: ${expense.description}`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
});