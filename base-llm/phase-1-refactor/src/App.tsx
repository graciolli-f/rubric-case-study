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