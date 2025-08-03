/**
 * Container component for expense form
 * Manages form state and validation
 */

import React, { useState, useEffect } from 'react';
import { useExpenseStore } from '../stores/expense-store';
import { validateExpenseForm, getValidationErrors } from '../utils/validation';
import { formatDateForInput } from '../utils/formatting';
import type { ExpenseFormData, ExpenseCategory } from '../types/expense.types';
import { EXPENSE_CATEGORIES } from '../types/expense.types';
import './ExpenseForm.css';

/**
 * Initial form data
 */
const getInitialFormData = (): ExpenseFormData => ({
  amount: '',
  description: '',
  category: 'Other' as ExpenseCategory,
  date: formatDateForInput(new Date())
});

/**
 * ExpenseForm component
 */
export default function ExpenseForm(): React.JSX.Element {
  // Form state
  const [formData, setFormData] = useState<ExpenseFormData>(getInitialFormData);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  
  // Store state
  const { 
    addExpense,
    updateExpense,
    isSubmitting, 
    validationErrors, 
    clearValidationErrors,
    error,
    clearError,
    editingExpense,
    isEditing,
    cancelEditing
  } = useExpenseStore();
  
  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearValidationErrors();
      clearError();
    };
  }, [clearValidationErrors, clearError]);
  
  // Populate form when editing mode is activated
  useEffect(() => {
    if (isEditing && editingExpense) {
      setFormData({
        amount: editingExpense.amount.toString(),
        description: editingExpense.description,
        category: editingExpense.category,
        date: editingExpense.date
      });
    } else if (!isEditing) {
      setFormData(getInitialFormData());
    }
  }, [isEditing, editingExpense]);
  
  /**
   * Handle input changes
   */
  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific errors when user starts typing
    if (localErrors[field] || validationErrors[field]) {
      setLocalErrors(prev => ({ ...prev, [field]: '' }));
      if (validationErrors[field]) {
        clearValidationErrors();
      }
    }
  };
  
  /**
   * Validate form locally before submission
   */
  const validateForm = (): boolean => {
    const currentDate = new Date().toISOString();
    const validation = validateExpenseForm(formData, currentDate);
    
    if (!validation.isValid) {
      setLocalErrors(getValidationErrors(validation.errors));
      return false;
    }
    
    setLocalErrors({});
    return true;
  };
  
  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    let success: boolean;
    
    if (isEditing && editingExpense) {
      success = await updateExpense(editingExpense.id, formData);
    } else {
      success = await addExpense(formData);
    }
    
    if (success) {
      // Reset form
      setFormData(getInitialFormData());
      setLocalErrors({});
    }
  };
  
  /**
   * Handle cancel editing
   */
  const handleCancelEdit = () => {
    cancelEditing();
    setLocalErrors({});
  };
  
  // Combine local and store validation errors
  const allErrors = { ...localErrors, ...validationErrors };
  
  // Check if form is valid
  const isFormValid = Object.keys(allErrors).length === 0 && 
                     formData.amount && 
                     formData.description && 
                     formData.category && 
                     formData.date;
  
  return (
    <form 
      className="expense-form" 
      onSubmit={handleSubmit}
      data-testid="expense-form"
      role="form"
      aria-label="Add new expense"
    >
      <h2 className="expense-form__title">
        {isEditing ? 'Edit Expense' : 'Add New Expense'}
      </h2>
      
      {error && (
        <div 
          className="expense-form__error"
          role="alert"
          aria-live="polite"
          data-testid="form-error"
        >
          {error}
        </div>
      )}
      
      <div className="expense-form__grid">
        {/* Amount Field */}
        <div className="expense-form__field">
          <label 
            htmlFor="amount" 
            className="expense-form__label expense-form__label--required"
          >
            Amount
          </label>
          <input
            id="amount"
            type="number"
            min="0.01"
            max="999999.99"
            step="0.01"
            className={`expense-form__input ${allErrors.amount ? 'expense-form__input--error' : ''}`}
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.00"
            data-testid="amount-input"
            aria-describedby={allErrors.amount ? "amount-error" : undefined}
            aria-invalid={!!allErrors.amount}
          />
          <div 
            id="amount-error"
            className="expense-form__error"
            aria-live="polite"
          >
            {allErrors.amount}
          </div>
        </div>
        
        {/* Category Field */}
        <div className="expense-form__field">
          <label 
            htmlFor="category" 
            className="expense-form__label expense-form__label--required"
          >
            Category
          </label>
          <select
            id="category"
            className={`expense-form__select ${allErrors.category ? 'expense-form__select--error' : ''}`}
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            data-testid="category-select"
            aria-describedby={allErrors.category ? "category-error" : undefined}
            aria-invalid={!!allErrors.category}
          >
            {EXPENSE_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <div 
            id="category-error"
            className="expense-form__error"
            aria-live="polite"
          >
            {allErrors.category}
          </div>
        </div>
        
        {/* Description Field */}
        <div className="expense-form__field expense-form__field--full-width">
          <label 
            htmlFor="description" 
            className="expense-form__label expense-form__label--required"
          >
            Description
          </label>
          <input
            id="description"
            type="text"
            maxLength={50}
            className={`expense-form__input ${allErrors.description ? 'expense-form__input--error' : ''}`}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Enter expense description"
            data-testid="description-input"
            aria-describedby={allErrors.description ? "description-error" : undefined}
            aria-invalid={!!allErrors.description}
          />
          <div 
            id="description-error"
            className="expense-form__error"
            aria-live="polite"
          >
            {allErrors.description}
          </div>
        </div>
        
        {/* Date Field */}
        <div className="expense-form__field">
          <label 
            htmlFor="date" 
            className="expense-form__label expense-form__label--required"
          >
            Date
          </label>
          <input
            id="date"
            type="date"
            className={`expense-form__input ${allErrors.date ? 'expense-form__input--error' : ''}`}
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            max={formatDateForInput(new Date())}
            data-testid="date-input"
            aria-describedby={allErrors.date ? "date-error" : undefined}
            aria-invalid={!!allErrors.date}
          />
          <div 
            id="date-error"
            className="expense-form__error"
            aria-live="polite"
          >
            {allErrors.date}
          </div>
        </div>
      </div>
      
      <div className="expense-form__actions">
        <button
          type="submit"
          className="expense-form__submit"
          disabled={!isFormValid || isSubmitting}
          data-testid="submit-button"
          aria-label={
            isSubmitting 
              ? (isEditing ? "Updating expense..." : "Adding expense...")
              : (isEditing ? "Update expense" : "Add expense")
          }
        >
          {isSubmitting && <span className="expense-form__loading" aria-hidden="true" />}
          {isSubmitting 
            ? (isEditing ? 'Updating...' : 'Adding...')
            : (isEditing ? 'Update Expense' : 'Add Expense')
          }
        </button>
        
        {isEditing && (
          <button
            type="button"
            className="expense-form__cancel"
            onClick={handleCancelEdit}
            disabled={isSubmitting}
            data-testid="cancel-button"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}