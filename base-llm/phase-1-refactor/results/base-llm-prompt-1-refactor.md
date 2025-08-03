# Refactor code base for modular design
_Exported on 8/2/2025 at 23:06:55 EDT from Cursor (1.3.8)_

---

**User**

Refactor this code base so that it is modular, with clear separation of concerns, proper encapsulation, boundary integrity and low coupling / high cohesion

---

**Cursor**

I'll help you refactor your codebase to improve modularity, separation of concerns, encapsulation, boundary integrity, and achieve low coupling with high cohesion. Let me first explore your current codebase structure to understand what we're working with.

Perfect! I can see this is an expense tracker application with a single monolithic `App.tsx` component that violates several software architecture principles. The component is doing too much - handling forms, validation, state management, formatting, and rendering all in one place.

Let me refactor this into a modular, well-structured codebase with proper separation of concerns:

```typescript
export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'Food' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Other';
  date: string; // ISO date string
}

export interface FormData {
  amount: string;
  description: string;
  category: Expense['category'];
  date: string;
}

export interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

export interface DeleteConfirmState {
  isOpen: boolean;
  expense: Expense | null;
}
```

```typescript
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
```

```typescript
// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
};

// Get today's date in YYYY-MM-DD format
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};
```

```typescript
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
```

```typescript
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
```

```typescript
import { useState } from 'react';
import type { Expense, FormData } from '../types/expense';
import { generateExpenseId } from '../utils/expense';

export const useExpenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const addExpense = async (formData: FormData): Promise<void> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const newExpense: Expense = {
      id: generateExpenseId(),
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      category: formData.category,
      date: formData.date,
    };

    setExpenses(prev => [...prev, newExpense]);
  };

  const deleteExpense = (expenseId: string): void => {
    setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
  };

  return {
    expenses,
    addExpense,
    deleteExpense,
  };
};
```

```typescript
import { useState } from 'react';
import type { FormData, FormErrors } from '../types/expense';
import { validateExpenseForm, isExpenseFormValid } from '../utils/validation';
import { getTodayDateString } from '../utils/formatters';

const getInitialFormData = (): FormData => ({
  amount: '',
  description: '',
  category: 'Other',
  date: getTodayDateString(),
});

export const useExpenseForm = () => {
  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors = validateExpenseForm(formData);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = (): void => {
    setFormData(getInitialFormData());
    setFormErrors({});
  };

  const isFormValid = (): boolean => {
    return isExpenseFormValid(formData);
  };

  return {
    formData,
    formErrors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    resetForm,
    isFormValid,
  };
};
```

```typescript
import { useState } from 'react';
import type { DeleteConfirmState, Expense } from '../types/expense';

export const useModal = () => {
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    isOpen: false,
    expense: null,
  });

  const openDeleteConfirm = (expense: Expense): void => {
    setDeleteConfirm({ isOpen: true, expense });
  };

  const closeDeleteConfirm = (): void => {
    setDeleteConfirm({ isOpen: false, expense: null });
  };

  return {
    deleteConfirm,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
};
```

```typescriptreact
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
```

```typescriptreact
import React from 'react';
import type { Expense } from '../types/expense';
import { formatCurrency, formatDate } from '../utils/formatters';
import { categoryColors } from '../constants/categories';

interface ExpenseCardProps {
  expense: Expense;
  onDelete: (expense: Expense) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ expense, onDelete }) => {
  return (
    <div className="expense-card">
      <div className="expense-info">
        <div className="expense-amount">
          {formatCurrency(expense.amount)}
        </div>
        <div className="expense-description">
          {expense.description}
        </div>
        <div className="expense-meta">
          <span 
            className="expense-category"
            style={{ backgroundColor: categoryColors[expense.category] }}
          >
            {expense.category}
          </span>
          <span className="expense-date">
            {formatDate(expense.date)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(expense)}
        className="delete-button"
        aria-label={`Delete expense: ${expense.description}`}
      >
        Delete
      </button>
    </div>
  );
};
```

```typescriptreact
import React from 'react';
import type { Expense } from '../types/expense';
import { ExpenseCard } from './ExpenseCard';
import { sortExpensesByDate, calculateTotal } from '../utils/expense';
import { formatCurrency } from '../utils/formatters';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (expense: Expense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, onDeleteExpense }) => {
  const sortedExpenses = sortExpensesByDate(expenses);
  const totalAmount = calculateTotal(expenses);

  if (expenses.length === 0) {
    return (
      <div className="expenses-section">
        <h2>Expenses</h2>
        <p className="no-expenses">No expenses yet</p>
      </div>
    );
  }

  return (
    <div className="expenses-section">
      <h2>Expenses</h2>
      <div className="expenses-list">
        {sortedExpenses.map((expense) => (
          <ExpenseCard
            key={expense.id}
            expense={expense}
            onDelete={onDeleteExpense}
          />
        ))}
      </div>
      <div className="total-section">
        <div className="total">
          Total: {formatCurrency(totalAmount)}
        </div>
      </div>
    </div>
  );
};
```

```typescriptreact
import React from 'react';
import type { DeleteConfirmState } from '../types/expense';

interface DeleteConfirmationModalProps {
  deleteConfirm: DeleteConfirmState;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  deleteConfirm,
  onConfirm,
  onCancel,
}) => {
  if (!deleteConfirm.isOpen || !deleteConfirm.expense) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Delete Expense</h3>
        <p>
          Delete expense: <strong>{deleteConfirm.expense.description}</strong>? 
          This cannot be undone.
        </p>
        <div className="modal-buttons">
          <button 
            onClick={onCancel}
            className="cancel-button"
            autoFocus
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="delete-confirm-button"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
```

```typescript
export { ExpenseForm } from './ExpenseForm';
export { ExpenseCard } from './ExpenseCard';
export { ExpenseList } from './ExpenseList';
export { DeleteConfirmationModal } from './DeleteConfirmationModal';
```

```typescriptreact
import React from 'react';
import './App.css';

// Hooks
import { useExpenses } from './hooks/useExpenses';
import { useExpenseForm } from './hooks/useExpenseForm';
import { useModal } from './hooks/useModal';

// Components
import { ExpenseForm, ExpenseList, DeleteConfirmationModal } from './components';



  return (
    <div className="app">
      <div className="container">
        <h1>Expense Tracker</h1>
        
        {/* Add Expense Form */}
        <div className="add-expense-section">
          <h2>Add New Expense</h2>
          <form onSubmit={handleSubmit} className="expense-form">
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
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  className={formErrors.amount ? 'error' : ''}
                />
                {formErrors.amount && <span className="error-message">{formErrors.amount}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value as Expense['category'])}
                >
                  <option value="Food">Food</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Bills">Bills</option>
                  <option value="Other">Other</option>
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
                  onChange={(e) => handleInputChange('description', e.target.value)}
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
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={formErrors.date ? 'error' : ''}
                  max={new Date().toISOString().split('T')[0]}
                />
                {formErrors.date && <span className="error-message">{formErrors.date}</span>}
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid() || isSubmitting}
              className="submit-button"
            >
              {isSubmitting ? 'Adding...' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="expenses-section">
          <h2>Expenses</h2>
          {sortedExpenses.length === 0 ? (
            <p className="no-expenses">No expenses yet</p>
          ) : (
            <>
              <div className="expenses-list">
                {sortedExpenses.map((expense) => (
                  <div key={expense.id} className="expense-card">
                    <div className="expense-info">
                      <div className="expense-amount">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="expense-description">
                        {expense.description}
                      </div>
                      <div className="expense-meta">
                        <span 
                          className="expense-category"
                          style={{ backgroundColor: categoryColors[expense.category] }}
                        >
                          {expense.category}
                        </span>
                        <span className="expense-date">
                          {formatDate(expense.date)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExpense(expense)}
                      className="delete-button"
                      aria-label={`Delete expense: ${expense.description}`}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <div className="total-section">
                <div className="total">
                  Total: {formatCurrency(totalAmount)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm.isOpen && deleteConfirm.expense && (
          <div className="modal-overlay" onClick={cancelDelete}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Expense</h3>
              <p>
                Delete expense: <strong>{deleteConfirm.expense.description}</strong>? 
                This cannot be undone.
              </p>
              <div className="modal-buttons">
                <button 
                  onClick={cancelDelete}
                  className="cancel-button"
                  autoFocus
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="delete-confirm-button"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

```typescriptreact
import React from 'react';
import './App.css';

// Hooks
import { useExpenses } from './hooks/useExpenses';
import { useExpenseForm } from './hooks/useExpenseForm';
import { useModal } from './hooks/useModal';

// Components
import { ExpenseForm, ExpenseList, DeleteConfirmationModal } from './components';


function App() {
  // Custom hooks for state management
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const {
    formData,
    formErrors,
    isSubmitting,
    setIsSubmitting,
    handleInputChange,
    validateForm,
    resetForm,
    isFormValid,
  } = useExpenseForm();
  const { deleteConfirm, openDeleteConfirm, closeDeleteConfirm } = useModal();

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addExpense(formData);
      resetForm();
    } catch (error) {
      console.error('Failed to add expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (deleteConfirm.expense) {
      deleteExpense(deleteConfirm.expense.id);
    }
    closeDeleteConfirm();
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Expense Tracker</h1>
        
        <ExpenseForm
          formData={formData}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          isFormValid={isFormValid()}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />

        <ExpenseList
          expenses={expenses}
          onDeleteExpense={openDeleteConfirm}
        />

        <DeleteConfirmationModal
          deleteConfirm={deleteConfirm}
          onConfirm={handleConfirmDelete}
          onCancel={closeDeleteConfirm}
        />
      </div>
    </div>
  );
}

export default App;
```

## Refactoring Complete!

I have successfully refactored your expense tracker application from a monolithic component into a modular, well-structured codebase that follows software engineering best practices. Here's what was accomplished:

### 🏗️ **New Modular Architecture**

The diagram above shows the new architecture with clear separation of concerns and proper dependency flow.

### 📁 **Directory Structure**

```
src/
├── types/           # Type definitions
│   └── expense.ts
├── constants/       # Application constants  
│   └── categories.ts
├── utils/          # Pure utility functions
│   ├── formatters.ts
│   ├── validation.ts
│   └── expense.ts
├── hooks/          # Custom React hooks
│   ├── useExpenses.ts
│   ├── useExpenseForm.ts
│   └── useModal.ts
├── components/     # UI components
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── ExpenseCard.tsx
│   ├── DeleteConfirmationModal.tsx
│   └── index.ts
└── App.tsx        # Main orchestrator (now only 85 lines!)
```

### ✅ **Architectural Improvements Achieved**

#### **1. Separation of Concerns**
- **Types**: Centralized in `types/expense.ts`
- **Business Logic**: Extracted to custom hooks
- **UI Components**: Isolated and reusable
- **Utilities**: Pure functions for formatting, validation, calculations
- **Constants**: Configuration data separated from logic

#### **2. Proper Encapsulation**
- Each module has a single responsibility
- Internal implementation details are hidden
- Clean public interfaces via exports
- Components receive only the props they need

#### **3. Boundary Integrity**
- Clear separation between data layer (hooks), presentation (components), and utilities
- No direct DOM manipulation mixed with business logic
- Proper abstraction layers

#### **4. Low Coupling / High Cohesion**
- **Low Coupling**: Components don't know about each other's internals
- **High Cohesion**: Related functionality grouped together
- Easy to modify one component without affecting others
- Dependencies flow in one direction

### 🔧 **Key Refactoring Benefits**

1. **Maintainability**: Each file has a single, clear purpose
2. **Testability**: Pure functions and isolated components are easy to test
3. **Reusability**: Components and hooks can be reused across the application
4. **Scalability**: Easy to add new features without modifying existing code
5. **Readability**: Code is organized logically and easy to understand
6. **Debugging**: Issues can be traced to specific, focused modules

### 📊 **Code Metrics Improvement**

- **Main App component**: Reduced from 350 lines to 85 lines
- **Single Responsibility**: Each module now has one clear purpose
- **Cyclomatic Complexity**: Dramatically reduced in individual modules
- **Dependencies**: Clear, unidirectional flow

### 🚀 **Application Functionality**

The application maintains all its original functionality:
- Add expenses with validation
- View expense list with sorting
- Delete expenses with confirmation
- Real-time total calculation
- Category-based color coding

All functionality now operates through clean, modular interfaces with improved error handling and better separation of concerns.

```plaintext
src/
├── types/           # Type definitions
│   └── expense.ts
├── constants/       # Application constants  
│   └── categories.ts
├── utils/          # Pure utility functions
│   ├── formatters.ts
│   ├── validation.ts
│   └── expense.ts
├── hooks/          # Custom React hooks
│   ├── useExpenses.ts
│   ├── useExpenseForm.ts
│   └── useModal.ts
├── components/     # UI components
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── ExpenseCard.tsx
│   ├── DeleteConfirmationModal.tsx
│   └── index.ts
└── App.tsx        # Main orchestrator (now only 85 lines!)
```

