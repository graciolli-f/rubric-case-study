/**
 * Pure formatting functions for display purposes
 * Currency, date, and text formatting utilities
 */

import type { ExpenseCategory } from '../types/expense.types';

/**
 * Currency formatting configuration
 */
const CURRENCY_LOCALE = 'en-US';
const CURRENCY_SYMBOL = 'USD';

/**
 * Category color mapping
 */
const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  Food: 'green',
  Transport: 'blue', 
  Shopping: 'purple',
  Entertainment: 'orange',
  Bills: 'red',
  Other: 'gray'
};

/**
 * Date formatting options
 */
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: '2-digit'
};

/**
 * Formats number as currency
 * @param amount - Number to format
 * @returns Formatted currency string (e.g., "$25.50")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_SYMBOL,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Parses currency input string to number
 * @param input - Currency input string
 * @returns Parsed number or NaN if invalid
 */
export function parseCurrencyInput(input: string): number {
  // Remove currency symbols and whitespace
  const cleaned = input.replace(/[$,\s]/g, '');
  return parseFloat(cleaned);
}

/**
 * Formats date for display
 * @param date - Date string or Date object
 * @returns Formatted date string (e.g., "Dec 15, 2024")
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  return dateObj.toLocaleDateString(CURRENCY_LOCALE, DATE_FORMAT_OPTIONS);
}

/**
 * Formats date for input field
 * @param date - Date string or Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  return dateObj.toISOString().split('T')[0];
}

/**
 * Capitalizes first letter of string
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalizeFirst(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Truncates text to specified length
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Gets category color
 * @param category - Expense category
 * @returns CSS color value
 */
export function getCategoryColor(category: ExpenseCategory): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

/**
 * Gets category label
 * @param category - Expense category
 * @returns Formatted category label
 */
export function getCategoryLabel(category: ExpenseCategory): string {
  return category;
}

/**
 * Currency configuration constants
 */
export const CURRENCY_CONFIG = {
  LOCALE: CURRENCY_LOCALE,
  CURRENCY: CURRENCY_SYMBOL
} as const;

/**
 * Date format constants
 */
export const DATE_FORMATS = {
  DISPLAY_OPTIONS: DATE_FORMAT_OPTIONS,
  INPUT_FORMAT: 'YYYY-MM-DD'
} as const;