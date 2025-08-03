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