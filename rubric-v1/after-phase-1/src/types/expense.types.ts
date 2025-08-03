/**
 * Type definitions for expense tracking domain
 * Defines core data structures and interfaces
 */

/**
 * Available expense categories
 */
export type ExpenseCategory = 'Food' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Other';

/**
 * Core expense data structure
 */
export interface Expense {
  /** Unique identifier for the expense */
  id: string;
  /** Expense amount in dollars */
  amount: number;
  /** Description of the expense */
  description: string;
  /** Category classification */
  category: ExpenseCategory;
  /** Date when expense occurred */
  date: string; // ISO date string
  /** Timestamp when expense was created */
  createdAt: string; // ISO date string
}

/**
 * Form validation error structure
 */
export interface ValidationError {
  /** Field that has the error */
  field: string;
  /** Error message to display */
  message: string;
}

/**
 * Expense form data interface
 */
export interface ExpenseFormData {
  /** Amount input value */
  amount: string;
  /** Description input value */
  description: string;
  /** Selected category */
  category: ExpenseCategory;
  /** Date input value */
  date: string;
}

/**
 * Filter and sort options for expense list
 */
export interface ExpenseFilters {
  /** Filter by category */
  category?: ExpenseCategory;
  /** Start date for date range filter */
  startDate?: string;
  /** End date for date range filter */
  endDate?: string;
  /** Sort field */
  sortBy: 'date' | 'amount' | 'description';
  /** Sort direction */
  sortOrder: 'asc' | 'desc';
}

/**
 * Available expense categories array
 */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Food',
  'Transport', 
  'Shopping',
  'Entertainment',
  'Bills',
  'Other'
];

/**
 * Validation rule constants
 */
export const VALIDATION_RULES = {
  /** Minimum description length */
  MIN_DESCRIPTION_LENGTH: 3,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 50,
  /** Minimum amount value */
  MIN_AMOUNT: 0.01,
  /** Maximum amount value */
  MAX_AMOUNT: 999999.99
} as const;