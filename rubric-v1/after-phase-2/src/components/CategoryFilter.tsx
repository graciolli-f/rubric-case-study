/**
 * Presentation component for category filtering
 * Displays filter buttons for expense categories with counts
 */

import React from 'react';
import type { Expense, ExpenseCategory } from '../types/expense.types';
import { EXPENSE_CATEGORIES } from '../types/expense.types';
import './CategoryFilter.css';

/**
 * Props for CategoryFilter component
 */
export interface CategoryFilterProps {
  /** Array of all expenses for counting */
  expenses: Expense[];
  /** Currently active filter categories */
  activeFilters: ExpenseCategory[];
  /** Callback when category filter is toggled */
  onToggleFilter: (category: ExpenseCategory) => void;
  /** Callback when all filters are cleared */
  onClearFilters: () => void;
}

/**
 * CategoryFilter component
 */
export default React.memo(function CategoryFilter({
  expenses,
  activeFilters,
  onToggleFilter,
  onClearFilters
}: CategoryFilterProps): React.JSX.Element {

  /**
   * Get count of expenses for a specific category
   */
  const getCategoryCount = (category: ExpenseCategory): number => {
    return expenses.filter(expense => expense.category === category).length;
  };

  /**
   * Get total count of all expenses
   */
  const getTotalCount = (): number => {
    return expenses.length;
  };

  /**
   * Handle category button click
   */
  const handleCategoryClick = (category: ExpenseCategory) => {
    onToggleFilter(category);
  };

  /**
   * Handle clear all filters click
   */
  const handleClearFilters = () => {
    onClearFilters();
  };

  /**
   * Handle keyboard interaction for category buttons
   */
  const handleCategoryKeyDown = (e: React.KeyboardEvent, category: ExpenseCategory) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCategoryClick(category);
    }
  };

  /**
   * Handle keyboard interaction for clear button
   */
  const handleClearKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClearFilters();
    }
  };

  return (
    <div 
      className="category-filter" 
      data-testid="category-filter"
      role="toolbar"
      aria-label="Filter expenses by category"
    >
      <h3 className="category-filter__title">Filter by Category</h3>
      
      <div className="category-filter__buttons">
        {/* All button */}
        <button
          type="button"
          className={`category-filter__button ${activeFilters.length === 0 ? 'category-filter__button--active' : ''}`}
          onClick={handleClearFilters}
          onKeyDown={handleClearKeyDown}
          aria-label={`Show all expenses (${getTotalCount()} total)`}
          aria-pressed={activeFilters.length === 0}
          data-testid="filter-all"
        >
          All ({getTotalCount()})
        </button>
        
        {/* Category buttons */}
        {EXPENSE_CATEGORIES.map(category => {
          const count = getCategoryCount(category);
          const isActive = activeFilters.includes(category);
          const categoryClass = `category-filter__button--${category.toLowerCase()}`;
          
          return (
            <button
              key={category}
              type="button"
              className={`category-filter__button ${categoryClass} ${isActive ? 'category-filter__button--active' : ''}`}
              onClick={() => handleCategoryClick(category)}
              onKeyDown={(e) => handleCategoryKeyDown(e, category)}
              aria-label={`Filter by ${category} (${count} expenses)`}
              aria-pressed={isActive}
              data-testid={`filter-${category.toLowerCase()}`}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>
    </div>
  );
});