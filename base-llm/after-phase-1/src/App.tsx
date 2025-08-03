import React, { useState } from 'react';
import './App.css';

// Types
interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'Food' | 'Transport' | 'Shopping' | 'Entertainment' | 'Bills' | 'Other';
  date: string; // ISO date string
}

interface FormData {
  amount: string;
  description: string;
  category: Expense['category'];
  date: string;
}

interface FormErrors {
  amount?: string;
  description?: string;
  date?: string;
}

// Category colors mapping
const categoryColors: Record<Expense['category'], string> = {
  Food: '#22c55e',      // green
  Transport: '#3b82f6', // blue
  Shopping: '#a855f7',  // purple
  Entertainment: '#f97316', // orange
  Bills: '#ef4444',     // red
  Other: '#6b7280',     // gray
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [formData, setFormData] = useState<FormData>({
    amount: '',
    description: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    expense: Expense | null;
  }>({ isOpen: false, expense: null });

  // Form validation that updates state (use only when needed)
  const validateForm = (): boolean => {
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
    const today = new Date().toISOString().split('T')[0];
    if (!formData.date) {
      errors.date = 'Date is required';
    } else if (formData.date > today) {
      errors.date = 'Date cannot be in the future';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if form is valid without updating state (safe for render)
  const isFormValid = (): boolean => {
    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      return false;
    }

    // Description validation
    if (!formData.description || formData.description.length < 3 || formData.description.length > 50) {
      return false;
    }

    // Date validation
    const today = new Date().toISOString().split('T')[0];
    if (!formData.date) {
      return false;
    } else if (formData.date > today) {
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const newExpense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(formData.amount),
      description: formData.description.trim(),
      category: formData.category,
      date: formData.date,
    };

    setExpenses(prev => [...prev, newExpense]);
    
    // Reset form
    setFormData({
      amount: '',
      description: '',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setIsSubmitting(false);
  };

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle delete expense
  const handleDeleteExpense = (expense: Expense) => {
    setDeleteConfirm({ isOpen: true, expense });
  };

  const confirmDelete = () => {
    if (deleteConfirm.expense) {
      setExpenses(prev => prev.filter(exp => exp.id !== deleteConfirm.expense!.id));
    }
    setDeleteConfirm({ isOpen: false, expense: null });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ isOpen: false, expense: null });
  };

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate total
  const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };



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