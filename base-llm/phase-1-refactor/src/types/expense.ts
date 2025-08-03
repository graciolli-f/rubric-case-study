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