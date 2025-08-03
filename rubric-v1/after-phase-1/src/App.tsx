/**
 * Root container component for expense tracking application
 * Orchestrates main components and provides global layout
 */

import React, { useEffect, useState } from 'react';
import { useExpenseStore } from './stores/expense-store';
import ExpenseForm from './components/ExpenseForm';
import ExpenseList from './components/ExpenseList';
import './App.css';

/**
 * Error boundary component
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Expense tracker error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app__error" role="alert">
          <h2 className="app__error-title">Something went wrong</h2>
          <p className="app__error-message">
            Please refresh the page to try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main App component
 */
export default function App(): React.JSX.Element {
  // Store state
  const { 
    expenses, 
    isLoading, 
    error, 
    total,
    loadExpenses, 
    deleteExpense,
    clearError 
  } = useExpenseStore();
  
  // Local loading state for initial load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Load expenses on mount
  useEffect(() => {
    loadExpenses();
    setIsInitialLoad(false);
  }, [loadExpenses]);
  
  /**
   * Handle expense deletion
   */
  const handleDeleteExpense = (id: string) => {
    deleteExpense(id);
  };
  
  /**
   * Handle error dismissal
   */
  const handleDismissError = () => {
    clearError();
  };
  
  return (
    <ErrorBoundary>
      <div className="app">
        {/* Skip to content link for accessibility */}
        <a 
          href="#main-content" 
          className="skip-link"
          aria-label="Skip to main content"
        >
          Skip to content
        </a>
        
        <div className="app__container">
          {/* Header */}
          <header className="app__header">
            <h1 className="app__title">Expense Tracker</h1>
            <p className="app__subtitle">
              Track your daily expenses and manage your budget
            </p>
          </header>
          
          {/* Main content */}
          <main 
            id="main-content"
            className="app__content"
            role="main"
            aria-label="Expense tracking application"
          >
            {/* Global error display */}
            {error && (
              <div 
                className="app__error"
                role="alert"
                aria-live="polite"
              >
                <h2 className="app__error-title">Error</h2>
                <p className="app__error-message">{error}</p>
                <button 
                  onClick={handleDismissError}
                  style={{ 
                    marginTop: '8px', 
                    background: 'transparent', 
                    border: '1px solid currentColor',
                    color: 'inherit',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Dismiss
                </button>
              </div>
            )}
            
            {/* Initial loading state */}
            {isInitialLoad && isLoading && (
              <div 
                className="app__loading"
                role="status"
                aria-label="Loading application"
              >
                <div className="app__loading-spinner" aria-hidden="true" />
                Loading...
              </div>
            )}
            
            {/* Application content */}
            {!isInitialLoad && (
              <>
                {/* Expense form */}
                <section aria-labelledby="add-expense-title">
                  <ExpenseForm />
                </section>
                
                {/* Expense list */}
                <section aria-labelledby="expense-list-title">
                  <ExpenseList
                    expenses={expenses}
                    isLoading={isLoading}
                    error={error}
                    total={total}
                    onDeleteExpense={handleDeleteExpense}
                  />
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}