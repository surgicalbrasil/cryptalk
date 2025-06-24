import React from 'react';
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Select,
  Textarea,
  Checkbox,
  Radio,
  RadioGroup,
  Stack
} from '@chakra-ui/react';
import { FormField as FormFieldType, ValidationRule } from '../../types';

interface FormFieldProps {
  field: FormFieldType;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  isDisabled?: boolean;
  options?: Array<{ value: string; label: string }>;
}

export const FormField: React.FC<FormFieldProps> = ({
  field,
  value,
  error,
  onChange,
  isDisabled = false,
  options = []
}) => {
  const renderInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            isDisabled={isDisabled}
            isInvalid={!!error}
          />
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            isDisabled={isDisabled}
            isInvalid={!!error}
          />
        );

      case 'select':
        return (
          <Select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'Select an option'}
            isDisabled={isDisabled}
            isInvalid={!!error}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'checkbox':
        return (
          <Checkbox
            isChecked={value || false}
            onChange={(e) => onChange(e.target.checked)}
            isDisabled={isDisabled}
          >
            {field.label}
          </Checkbox>
        );

      case 'radio':
        return (
          <RadioGroup value={value || ''} onChange={onChange}>
            <Stack direction="row">
              {options.map((option) => (
                <Radio key={option.value} value={option.value} isDisabled={isDisabled}>
                  {option.label}
                </Radio>
              ))}
            </Stack>
          </RadioGroup>
        );

      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => onChange(e.target.files?.[0] || null)}
            isDisabled={isDisabled}
            isInvalid={!!error}
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            isDisabled={isDisabled}
            isInvalid={!!error}
          />
        );
    }
  };

  return (
    <FormControl isRequired={field.required} isInvalid={!!error} isDisabled={isDisabled}>
      {field.type !== 'checkbox' && (
        <FormLabel htmlFor={field.name}>{field.label}</FormLabel>
      )}
      
      {renderInput()}
      
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      
      {!error && field.placeholder && field.type !== 'checkbox' && (
        <FormHelperText>{field.placeholder}</FormHelperText>
      )}
    </FormControl>
  );
};