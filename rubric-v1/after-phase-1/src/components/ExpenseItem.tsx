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
}

/**
 * ExpenseItem component
 */
export default React.memo(function ExpenseItem({ 
  expense, 
  onDelete 
}: ExpenseItemProps): React.JSX.Element {
  
  /**
   * Handle delete button click
   */
  const handleDelete = () => {
    onDelete(expense.id);
  };
  
  /**
   * Handle delete button keyboard interaction
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleDelete();
    }
  };
  
  const categoryClass = `expense-item__category--${expense.category.toLowerCase()}`;
  
  return (
    <li 
      className="expense-item"
      data-testid="expense-item"
      role="listitem"
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
          onKeyDown={handleKeyDown}
          aria-label={`Delete expense: ${expense.description}`}
          data-testid="delete-button"
          title="Delete expense"
        >
          <Trash2 className="expense-item__delete-icon" aria-hidden="true" />
        </button>
      </div>
    </li>
  );
});