/**
 * State management for expense tracking
 * Coordinates between UI and local storage operations
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Expense, ExpenseFormData, ValidationError } from '../types/expense.types';
import { validateExpenseForm, getValidationErrors } from '../utils/validation';

/**
 * Expense store state interface
 */
interface ExpenseState {
  // Core data
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  
  // Form state
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
  
  // Computed values
  total: number;
  
  // Actions
  loadExpenses: () => void;
  addExpense: (formData: ExpenseFormData) => Promise<boolean>;
  deleteExpense: (id: string) => void;
  clearError: () => void;
  setValidationErrors: (errors: ValidationError[]) => void;
  clearValidationErrors: () => void;
}

/**
 * Local storage key for expenses
 */
const STORAGE_KEY = 'expense-tracker-expenses';

/**
 * Helper function to save expenses to localStorage
 */
function saveExpensesToStorage(expenses: Expense[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (error) {
    console.warn('Failed to save expenses to localStorage:', error);
  }
}

/**
 * Helper function to load expenses from localStorage
 */
function loadExpensesFromStorage(): Expense[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load expenses from localStorage:', error);
    return [];
  }
}

/**
 * Calculate total amount from expenses
 */
function calculateTotal(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Generate unique ID for new expense
 */
function generateId(): string {
  return `expense-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current ISO date string
 */
function getCurrentDate(): string {
  return new Date().toISOString();
}

/**
 * Zustand store for expense management
 */
export const useExpenseStore = create<ExpenseState>()(
  immer((set, get) => ({
    // Initial state
    expenses: [],
    isLoading: false,
    error: null,
    isSubmitting: false,
    validationErrors: {},
    total: 0,
    
    // Load expenses from localStorage
    loadExpenses: () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const expenses = loadExpensesFromStorage();
        // Sort by date (newest first)
        const sortedExpenses = expenses.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        set((state) => {
          state.expenses = sortedExpenses;
          state.total = calculateTotal(sortedExpenses);
          state.isLoading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = 'Failed to load expenses';
          state.isLoading = false;
        });
      }
    },
    
    // Add new expense
    addExpense: async (formData: ExpenseFormData): Promise<boolean> => {
      const currentDate = getCurrentDate();
      
      // Validate form data
      const validation = validateExpenseForm(formData, currentDate);
      
      if (!validation.isValid) {
        set((state) => {
          state.validationErrors = getValidationErrors(validation.errors);
        });
        return false;
      }
      
      set((state) => {
        state.isSubmitting = true;
        state.validationErrors = {};
        state.error = null;
      });
      
      try {
        // Create new expense
        const newExpense: Expense = {
          id: generateId(),
          amount: parseFloat(formData.amount),
          description: formData.description.trim(),
          category: formData.category,
          date: formData.date,
          createdAt: currentDate
        };
        
        const updatedExpenses = [newExpense, ...get().expenses];
        
        // Save to localStorage
        saveExpensesToStorage(updatedExpenses);
        
        set((state) => {
          state.expenses = updatedExpenses;
          state.total = calculateTotal(updatedExpenses);
          state.isSubmitting = false;
        });
        
        return true;
      } catch (error) {
        set((state) => {
          state.error = 'Failed to add expense';
          state.isSubmitting = false;
        });
        return false;
      }
    },
    
    // Delete expense
    deleteExpense: (id: string) => {
      const expenses = get().expenses;
      const updatedExpenses = expenses.filter(expense => expense.id !== id);
      
      try {
        // Save to localStorage
        saveExpensesToStorage(updatedExpenses);
        
        set((state) => {
          state.expenses = updatedExpenses;
          state.total = calculateTotal(updatedExpenses);
          state.error = null;
        });
      } catch (error) {
        set((state) => {
          state.error = 'Failed to delete expense';
        });
      }
    },
    
    // Clear error
    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
    
    // Set validation errors
    setValidationErrors: (errors: ValidationError[]) => {
      set((state) => {
        state.validationErrors = getValidationErrors(errors);
      });
    },
    
    // Clear validation errors
    clearValidationErrors: () => {
      set((state) => {
        state.validationErrors = {};
      });
    }
  }))
);