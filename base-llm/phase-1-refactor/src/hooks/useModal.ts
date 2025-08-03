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