import type { Expense } from '../types/expense';

// Sort expenses by date (newest first)
export const sortExpensesByDate = (expenses: Expense[]): Expense[] => {
  return [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Calculate total amount from expenses
export const calculateTotal = (expenses: Expense[]): number => {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
};

// Generate unique ID for new expense
export const generateExpenseId = (): string => {
  return Date.now().toString();
};