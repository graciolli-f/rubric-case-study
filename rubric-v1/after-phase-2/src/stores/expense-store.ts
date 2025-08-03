/**
 * State management for expense tracking
 * Coordinates between UI and local storage operations
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Expense, ExpenseFormData, ValidationError, ExpenseCategory } from '../types/expense.types';
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
  
  // Editing state
  editingExpense: Expense | null;
  isEditing: boolean;
  
  // Filtering state
  activeFilters: ExpenseCategory[];
  
  // Computed values
  total: number;
  filteredExpenses: Expense[];
  filteredTotal: number;
  
  // Actions
  loadExpenses: () => void;
  addExpense: (formData: ExpenseFormData) => Promise<boolean>;
  updateExpense: (id: string, formData: ExpenseFormData) => Promise<boolean>;
  deleteExpense: (id: string) => void;
  startEditing: (expense: Expense) => void;
  cancelEditing: () => void;
  toggleCategoryFilter: (category: ExpenseCategory) => void;
  clearFilters: () => void;
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
 * Filter expenses by active categories
 */
function filterExpenses(expenses: Expense[], activeFilters: ExpenseCategory[]): Expense[] {
  if (activeFilters.length === 0) {
    return expenses;
  }
  return expenses.filter(expense => activeFilters.includes(expense.category));
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
    editingExpense: null,
    isEditing: false,
    activeFilters: [],
    total: 0,
    filteredExpenses: [],
    filteredTotal: 0,
    
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
          state.filteredExpenses = filterExpenses(sortedExpenses, state.activeFilters);
          state.filteredTotal = calculateTotal(state.filteredExpenses);
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
          state.filteredExpenses = filterExpenses(updatedExpenses, state.activeFilters);
          state.filteredTotal = calculateTotal(state.filteredExpenses);
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
          state.filteredExpenses = filterExpenses(updatedExpenses, state.activeFilters);
          state.filteredTotal = calculateTotal(state.filteredExpenses);
          state.error = null;
        });
      } catch (error) {
        set((state) => {
          state.error = 'Failed to delete expense';
        });
      }
    },
    
    // Update existing expense
    updateExpense: async (id: string, formData: ExpenseFormData): Promise<boolean> => {
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
        const expenses = get().expenses;
        const expenseIndex = expenses.findIndex(expense => expense.id === id);
        
        if (expenseIndex === -1) {
          throw new Error('Expense not found');
        }
        
        // Update expense
        const updatedExpense: Expense = {
          ...expenses[expenseIndex],
          amount: parseFloat(formData.amount),
          description: formData.description.trim(),
          category: formData.category,
          date: formData.date
        };
        
        const updatedExpenses = [...expenses];
        updatedExpenses[expenseIndex] = updatedExpense;
        
        // Sort by date (newest first)
        updatedExpenses.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        
        // Save to localStorage
        saveExpensesToStorage(updatedExpenses);
        
        set((state) => {
          state.expenses = updatedExpenses;
          state.total = calculateTotal(updatedExpenses);
          state.filteredExpenses = filterExpenses(updatedExpenses, state.activeFilters);
          state.filteredTotal = calculateTotal(state.filteredExpenses);
          state.isSubmitting = false;
          state.editingExpense = null;
          state.isEditing = false;
        });
        
        return true;
      } catch (error) {
        set((state) => {
          state.error = 'Failed to update expense';
          state.isSubmitting = false;
        });
        return false;
      }
    },
    
    // Start editing an expense
    startEditing: (expense: Expense) => {
      set((state) => {
        state.editingExpense = expense;
        state.isEditing = true;
        state.validationErrors = {};
        state.error = null;
      });
    },
    
    // Cancel editing
    cancelEditing: () => {
      set((state) => {
        state.editingExpense = null;
        state.isEditing = false;
        state.validationErrors = {};
      });
    },
    
    // Toggle category filter
    toggleCategoryFilter: (category: ExpenseCategory) => {
      set((state) => {
        const currentFilters = state.activeFilters;
        const isActive = currentFilters.includes(category);
        
        if (isActive) {
          state.activeFilters = currentFilters.filter(filter => filter !== category);
        } else {
          state.activeFilters = [...currentFilters, category];
        }
        
        // Update filtered data
        state.filteredExpenses = filterExpenses(state.expenses, state.activeFilters);
        state.filteredTotal = calculateTotal(state.filteredExpenses);
      });
    },
    
    // Clear all filters
    clearFilters: () => {
      set((state) => {
        state.activeFilters = [];
        state.filteredExpenses = state.expenses;
        state.filteredTotal = state.total;
      });
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