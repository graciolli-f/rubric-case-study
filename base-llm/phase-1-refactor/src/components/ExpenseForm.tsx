import React from 'react';
import type { FormData, FormErrors } from '../types/expense';
import { categoryOptions } from '../constants/categories';
import { getTodayDateString } from '../utils/formatters';

interface ExpenseFormProps {
  formData: FormData;
  formErrors: FormErrors;
  isSubmitting: boolean;
  isFormValid: boolean;
  onInputChange: (field: keyof FormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  formData,
  formErrors,
  isSubmitting,
  isFormValid,
  onInputChange,
  onSubmit,
}) => {
  return (
    <div className="add-expense-section">
      <h2>Add New Expense</h2>
      <form onSubmit={onSubmit} className="expense-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => onInputChange('amount', e.target.value)}
              className={formErrors.amount ? 'error' : ''}
            />
            {formErrors.amount && <span className="error-message">{formErrors.amount}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => onInputChange('category', e.target.value)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              type="text"
              placeholder="Enter description (3-50 characters)"
              value={formData.description}
              onChange={(e) => onInputChange('description', e.target.value)}
              className={formErrors.description ? 'error' : ''}
              maxLength={50}
            />
            {formErrors.description && <span className="error-message">{formErrors.description}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => onInputChange('date', e.target.value)}
              className={formErrors.date ? 'error' : ''}
              max={getTodayDateString()}
            />
            {formErrors.date && <span className="error-message">{formErrors.date}</span>}
          </div>
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
};