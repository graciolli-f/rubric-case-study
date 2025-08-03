import type { FormData, FormErrors } from '../types/expense';
import { getTodayDateString } from './formatters';

// Validate form data and return errors object
export const validateExpenseForm = (formData: FormData): FormErrors => {
  const errors: FormErrors = {};

  // Amount validation
  const amount = parseFloat(formData.amount);
  if (!formData.amount || isNaN(amount) || amount <= 0) {
    errors.amount = 'Amount must be greater than 0';
  }

  // Description validation
  if (!formData.description || formData.description.length < 3 || formData.description.length > 50) {
    errors.description = 'Description must be 3-50 characters';
  }

  // Date validation
  const today = getTodayDateString();
  if (!formData.date) {
    errors.date = 'Date is required';
  } else if (formData.date > today) {
    errors.date = 'Date cannot be in the future';
  }

  return errors;
};

// Check if form is valid (returns boolean without side effects)
export const isExpenseFormValid = (formData: FormData): boolean => {
  const errors = validateExpenseForm(formData);
  return Object.keys(errors).length === 0;
};