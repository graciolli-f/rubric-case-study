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