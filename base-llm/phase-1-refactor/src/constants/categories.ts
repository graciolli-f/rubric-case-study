import type { Expense } from '../types/expense';

// Category colors mapping
export const categoryColors: Record<Expense['category'], string> = {
  Food: '#22c55e',      // green
  Transport: '#3b82f6', // blue
  Shopping: '#a855f7',  // purple
  Entertainment: '#f97316', // orange
  Bills: '#ef4444',     // red
  Other: '#6b7280',     // gray
};

// Category options for forms
export const categoryOptions: Expense['category'][] = [
  'Food',
  'Transport', 
  'Shopping',
  'Entertainment',
  'Bills',
  'Other'
];