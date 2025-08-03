/**
 * Pure validation functions for expense form data
 * No side effects, deterministic validation logic
 */

import type { ExpenseFormData, ExpenseCategory, ValidationError } from '../types/expense.types';
import { EXPENSE_CATEGORIES, VALIDATION_RULES } from '../types/expense.types';

/**
 * Validates expense amount
 * @param amount - Amount string to validate
 * @returns True if valid, false otherwise
 */
export function validateAmount(amount: string): boolean {
  if (!amount || amount.trim() === '') return false;
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return false;
  
  return numAmount >= VALIDATION_RULES.MIN_AMOUNT && numAmount <= VALIDATION_RULES.MAX_AMOUNT;
}

/**
 * Validates expense description
 * @param description - Description string to validate
 * @returns True if valid, false otherwise
 */
export function validateDescription(description: string): boolean {
  if (!description) return false;
  
  const trimmed = description.trim();
  return trimmed.length >= VALIDATION_RULES.MIN_DESCRIPTION_LENGTH && 
         trimmed.length <= VALIDATION_RULES.MAX_DESCRIPTION_LENGTH;
}

/**
 * Validates expense category
 * @param category - Category to validate
 * @returns True if valid, false otherwise
 */
export function validateCategory(category: string): boolean {
  return EXPENSE_CATEGORIES.includes(category as ExpenseCategory);
}

/**
 * Validates expense date
 * @param date - Date string to validate
 * @param currentDate - Current date for comparison (passed to avoid Date.now())
 * @returns True if valid, false otherwise
 */
export function validateDate(date: string, currentDate: string): boolean {
  if (!date) return false;
  
  const expenseDate = new Date(date);
  const current = new Date(currentDate);
  
  // Check if date is valid
  if (isNaN(expenseDate.getTime())) return false;
  
  // Check if date is not in the future
  return expenseDate <= current;
}

/**
 * Checks if value is a positive number
 * @param value - Value to check
 * @returns True if positive number, false otherwise
 */
export function isPositiveNumber(value: string): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Checks if date string represents a valid date
 * @param date - Date string to check
 * @returns True if valid date, false otherwise
 */
export function isValidDate(date: string): boolean {
  if (!date) return false;
  const parsedDate = new Date(date);
  return !isNaN(parsedDate.getTime());
}

/**
 * Checks if date is in the future
 * @param date - Date string to check
 * @param currentDate - Current date for comparison
 * @returns True if future date, false otherwise
 */
export function isFutureDate(date: string, currentDate: string): boolean {
  if (!isValidDate(date)) return false;
  
  const expenseDate = new Date(date);
  const current = new Date(currentDate);
  
  return expenseDate > current;
}

/**
 * Validates entire expense form
 * @param formData - Form data to validate
 * @param currentDate - Current date for date validation
 * @returns Validation result with errors
 */
export function validateExpenseForm(formData: ExpenseFormData, currentDate: string): {
  isValid: boolean;
  errors: ValidationError[];
} {
  // Build errors array immutably
  const amountError = !validateAmount(formData.amount) ? {
    field: 'amount',
    message: 'Amount must be greater than 0'
  } : null;
  
  const descriptionError = !validateDescription(formData.description) ? {
    field: 'description',
    message: 'Description must be 3-50 characters'
  } : null;
  
  const categoryError = !validateCategory(formData.category) ? {
    field: 'category',
    message: 'Please select a valid category'
  } : null;
  
  const dateError = !validateDate(formData.date, currentDate) ? {
    field: 'date',
    message: isFutureDate(formData.date, currentDate) 
      ? 'Date cannot be in the future'
      : 'Please enter a valid date'
  } : null;
  
  const errors = [amountError, descriptionError, categoryError, dateError]
    .filter((error): error is ValidationError => error !== null);
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Gets validation errors for display
 * @param errors - Array of validation errors
 * @returns Object with field names as keys and error messages as values
 */
export function getValidationErrors(errors: ValidationError[]): Record<string, string> {
  return errors.reduce((errorMap, error) => ({
    ...errorMap,
    [error.field]: error.message
  }), {} as Record<string, string>);
}

/**
 * Validation configuration constants
 */
export const VALIDATION_RULES_EXPORT = VALIDATION_RULES;