import React from 'react';
import type { Expense } from '../types/expense';
import { formatCurrency, formatDate } from '../utils/formatters';
import { categoryColors } from '../constants/categories';

interface ExpenseCardProps {
  expense: Expense;
  onDelete: (expense: Expense) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete }) => {
  return (
    <div className="expense-card">
      <div className="expense-info">
        <div className="expense-amount">
          {formatCurrency(expense.amount)}
        </div>
        <div className="expense-description">
          {expense.description}
        </div>
        <div className="expense-meta">
          <span 
            className="expense-category"
            style={{ backgroundColor: categoryColors[expense.category] }}
          >
            {expense.category}
          </span>
          <span className="expense-date">
            {formatDate(expense.date)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(expense)}
        className="delete-button"
        aria-label={`Delete expense: ${expense.description}`}
      >
        Delete
      </button>
    </div>
  );
};