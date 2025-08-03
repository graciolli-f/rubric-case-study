/**
 * Presentation component for displaying expense list
 * Pure component that receives data via props
 */

import React, { useState } from 'react';
import { Receipt } from 'lucide-react';
import ExpenseItem from './ExpenseItem';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { formatCurrency } from '../utils/formatting';
import type { Expense } from '../types/expense.types';
import './ExpenseList.css';

/**
 * Props for ExpenseList component
 */
export interface ExpenseListProps {
  /** Array of expenses to display */
  expenses: Expense[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message if any */
  error?: string | null;
  /** Total amount */
  total: number;
  /** Callback when expense is deleted */
  onDeleteExpense: (id: string) => void;
}

/**
 * ExpenseList component
 */
export default React.memo(function ExpenseList({
  expenses,
  isLoading = false,
  error = null,
  total,
  onDeleteExpense
}: ExpenseListProps): React.JSX.Element {
  
  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  /**
   * Handle delete expense request
   */
  const handleDeleteRequest = (id: string) => {
    const expense = expenses.find(e => e.id === id);
    if (expense) {
      setSelectedExpense(expense);
      setShowDeleteDialog(true);
    }
  };
  
  /**
   * Handle delete confirmation
   */
  const handleConfirmDelete = () => {
    if (selectedExpense) {
      onDeleteExpense(selectedExpense.id);
      setShowDeleteDialog(false);
      setSelectedExpense(null);
    }
  };
  
  /**
   * Handle delete cancellation
   */
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSelectedExpense(null);
  };
  
  return (
    <div className="expense-list" data-testid="expense-list">
      {/* Header */}
      <div className="expense-list__header">
        <h2 className="expense-list__title">Expenses</h2>
      </div>
      
      {/* Content */}
      <div className="expense-list__content">
        {/* Loading state */}
        {isLoading && (
          <div 
            className="expense-list__loading"
            role="status"
            aria-label="Loading expenses"
          >
            <div className="expense-list__loading-spinner" aria-hidden="true" />
            Loading expenses...
          </div>
        )}
        
        {/* Error state */}
        {error && !isLoading && (
          <div 
            className="expense-list__error"
            role="alert"
            aria-live="polite"
            data-testid="error-message"
          >
            {error}
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && !error && expenses.length === 0 && (
          <div 
            className="expense-list__empty"
            data-testid="empty-state"
          >
            <Receipt className="expense-list__empty-icon" aria-hidden="true" />
            <h3 className="expense-list__empty-title">No expenses yet</h3>
            <p className="expense-list__empty-text">
              Add your first expense using the form above
            </p>
          </div>
        )}
        
        {/* Expense items */}
        {!isLoading && !error && expenses.length > 0 && (
          <ul 
            className="expense-list__items"
            role="list"
            aria-label="Expense list"
          >
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                onDelete={handleDeleteRequest}
              />
            ))}
          </ul>
        )}
      </div>
      
      {/* Total */}
      {!isLoading && !error && expenses.length > 0 && (
        <div className="expense-list__total">
          <p className="expense-list__total-label">Total:</p>
          <p 
            className="expense-list__total-amount"
            aria-label={`Total amount: ${formatCurrency(total)}`}
            data-testid="total-amount"
          >
            {formatCurrency(total)}
          </p>
        </div>
      )}
      
      {/* Delete confirmation dialog */}
      {showDeleteDialog && selectedExpense && (
        <DeleteConfirmDialog
          expense={selectedExpense}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
});