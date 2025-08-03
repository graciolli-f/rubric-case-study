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