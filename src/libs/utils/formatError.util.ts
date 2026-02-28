import { type ValidationError } from '@nestjs/common';

export const formatError = (errors: ValidationError[]): string[] => {
  return errors.reduce((acc: string[], err) => {
    if (err.constraints) {
      acc.push(...Object.values(err.constraints));
    }
    if (err.children && err.children.length > 0) {
      acc.push(...formatError(err.children));
    }
    return acc;
  }, []);
};
