/**
 * Presentation component for displaying individual expense
 * Pure component with delete action handling
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatting';
import type { Expense } from '../types/expense.types';
import './ExpenseItem.css';

/**
 * Props for ExpenseItem component
 */
export interface ExpenseItemProps {
  /** Expense data to display */
  expense: Expense;
  /** Callback when delete button is clicked */
  onDelete: (id: string) => void;
  /** Callback when expense item is clicked for editing */
  onEdit?: (expense: Expense) => void;
  /** Whether this expense is currently being edited */
  isEditing?: boolean;
}

/**
 * ExpenseItem component
 */
export default React.memo(function ExpenseItem({ 
  expense, 
  onDelete,
  onEdit,
  isEditing = false
}: ExpenseItemProps): React.JSX.Element {
  
  /**
   * Handle delete button click
   */
  const handleDelete = () => {
    onDelete(expense.id);
  };
  
  /**
   * Handle expense item click for editing
   */
  const handleEdit = () => {
    if (onEdit && !isEditing) {
      onEdit(expense);
    }
  };
  
  /**
   * Handle delete button keyboard interaction
   */
  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDelete();
    }
  };
  
  /**
   * Handle expense item keyboard interaction for editing
   */
  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onEdit && !isEditing) {
      e.preventDefault();
      handleEdit();
    }
  };
  
  const categoryClass = `expense-item__category--${expense.category.toLowerCase()}`;
  
  return (
    <li 
      className={`expense-item ${isEditing ? 'expense-item--editing' : ''} ${onEdit ? 'expense-item--clickable' : ''}`}
      data-testid="expense-item"
      role="listitem"
      onClick={handleEdit}
      onKeyDown={handleEditKeyDown}
      tabIndex={onEdit ? 0 : -1}
      aria-label={onEdit ? `Edit expense: ${expense.description}` : undefined}
    >
      {/* Category indicator */}
      <div 
        className={`expense-item__category ${categoryClass}`}
        aria-label={`Category: ${expense.category}`}
        role="img"
      />
      
      {/* Expense content */}
      <div className="expense-item__content">
        <h3 className="expense-item__description">
          {expense.description}
        </h3>
        <div className="expense-item__meta">
          <span className="expense-item__category-text">
            {expense.category}
          </span>
          <span aria-label={`Date: ${formatDate(expense.date)}`}>
            {formatDate(expense.date)}
          </span>
        </div>
      </div>
      
      {/* Amount */}
      <div 
        className="expense-item__amount"
        aria-label={`Amount: ${formatCurrency(expense.amount)}`}
      >
        {formatCurrency(expense.amount)}
      </div>
      
      {/* Actions */}
      <div className="expense-item__actions">
        <button
          type="button"
          className="expense-item__delete"
          onClick={handleDelete}
          onKeyDown={handleDeleteKeyDown}
          aria-label={`Delete expense: ${expense.description}`}
          data-testid="delete-button"
          title="Delete expense"
        >
          <Trash2 className="expense-item__delete-icon" aria-hidden="true" />
        </button>
      </div>
      
      {/* Editing overlay */}
      {isEditing && (
        <div 
          className="expense-item__editing-overlay"
          aria-hidden="true"
        >
          <span className="expense-item__editing-text">Editing...</span>
        </div>
      )}
    </li>
  );
});