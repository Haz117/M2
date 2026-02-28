/**
 * Form & Input Validation Utilities
 * Validación en tiempo real, sanitización, helpers
 */

import { useState, useCallback, useRef } from 'react';

/**
 * Validadores reusables
 */
export const Validators = {
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  password: (value) => {
    // Mínimo 8 caracteres, al menos una mayúscula, un número
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(value);
  },

  phone: (value) => {
    const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    return phoneRegex.test(value.replace(/\s/g, ''));
  },

  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  number: (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  integer: (value) => {
    return Number.isInteger(parseFloat(value));
  },

  minLength: (min) => (value) => value?.length >= min,
  maxLength: (max) => (value) => value?.length <= max,
  min: (n) => (value) => parseFloat(value) >= n,
  max: (n) => (value) => parseFloat(value) <= n,
  required: (value) => {
    if (typeof value === 'string') return value.trim().length > 0;
    return value !== null && value !== undefined;
  },

  match: (fieldValue) => (value) => value === fieldValue, // Para confirmaciones
};

/**
 * Hook para validación de campo
 */
export const useFieldValidation = (initialValue = '', validator = null) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const validate = useCallback(() => {
    if (!validator) return true;

    const isValid = typeof validator === 'function' ? validator(value) : true;
    if (!isValid) {
      setError('Campo inválido');
      return false;
    }
    setError(null);
    return true;
  }, [value, validator]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    if (touched) validate(); // Re-validate on change if already touched
  }, [touched, validate]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    validate();
  }, [validate]);

  const handleFocus = useCallback(() => {
    // Reset error on focus
    if (error) setError(null);
  }, [error]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(null);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    setValue: handleChange,
    error: touched ? error : null,
    isValid: error === null,
    isTouched: touched,
    isFocused: false, // Can be linked to input focus
    validate,
    reset,
    bind: {
      value,
      onChangeText: handleChange,
      onBlur: handleBlur,
      onFocus: handleFocus,
    },
  };
};

/**
 * Hook para validación de formulario completo
 */
export const useFormValidation = (initialValues = {}, validators = {}, onSubmit = null) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback(() => {
    const newErrors = {};

    Object.entries(validators).forEach(([field, validator]) => {
      if (validator && !validator(values[field])) {
        newErrors[field] = `${field} es inválido`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validators]);

  const handleChange = useCallback((field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Limpiar error si existe
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const handleBlur = useCallback((field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validar este campo específico
    if (validators[field]) {
      const isValid = validators[field](values[field]);
      if (!isValid) {
        setErrors((prev) => ({ ...prev, [field]: `${field} es inválido` }));
      }
    }
  }, [values, validators]);

  const handleSubmit = useCallback(async () => {
    // Marcar todos como touched
    const allTouched = Object.keys(initialValues).reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {}
    );
    setTouched(allTouched);

    // Validar formulario
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        if (onSubmit) {
          await onSubmit(values);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [values, validateForm, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const getFieldProps = useCallback((field) => ({
    value: values[field] || '',
    error: touched[field] ? errors[field] : null,
    onChangeText: (value) => handleChange(field, value),
    onBlur: () => handleBlur(field),
    isTouched: touched[field],
    isValid: !errors[field],
  }), [values, errors, touched, handleChange, handleBlur]);

  const isValid = Object.keys(errors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid: isValid && touched && Object.keys(touched).length > 0,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
    setFieldValue: handleChange,
    setFieldError: (field, error) => setErrors((prev) => ({ ...prev, [field]: error })),
  };
};

/**
 * Formatadores de input
 */
export const Formatters = {
  // Teléfono: (123) 456-7890
  phone: (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  },

  // Tarjeta: 1234 5678 9012 3456
  creditCard: (value) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{4})/g, '$1 ').trim();
  },

  // Fecha: MM/DD/YY
  date: (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 6)}`;
  },

  // Moneda: $1,234.56
  currency: (value, currencySymbol = '$') => {
    const cleaned = parseFloat(value.replace(/[^\d.]/g, '')) || 0;
    return `${currencySymbol}${cleaned.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  },

  // Capitalizar primera letra
  capitalize: (value) => {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  },

  // MAYÚSCULAS
  uppercase: (value) => value.toUpperCase(),

  // minúsculas
  lowercase: (value) => value.toLowerCase(),

  // Remover espacios extras
  trim: (value) => value.trim().replace(/\s+/g, ' '),

  // Sin acentos
  noAccents: (value) => {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  },
};

/**
 * Parser de valores
 */
export const Parsers = {
  toNumber: (value) => parseFloat(value) || 0,
  toInteger: (value) => parseInt(value) || 0,
  toBoolean: (value) => value === true || value === 'true',
  toEmail: (value) => value.toLowerCase().trim(),
  toDate: (value) => new Date(value),
};

/**
 * Hook para input con formatter
 */
export const useFormattedInput = (formatter = null) => {
  const [value, setValue] = useState('');

  const handleChange = useCallback((newValue) => {
    const formatted = formatter ? formatter(newValue) : newValue;
    setValue(formatted);
  }, [formatter]);

  const reset = useCallback(() => {
    setValue('');
  }, []);

  return {
    value,
    onChange: handleChange,
    reset,
  };
};

export default {
  Validators,
  useFieldValidation,
  useFormValidation,
  Formatters,
  Parsers,
  useFormattedInput,
};
