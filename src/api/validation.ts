import { http } from './client';
import type { ValidationResult } from './types';

export const validationApi = {
  run: (projectId: string) =>
    http.post<ValidationResult>(`/projects/${projectId}/validate`),
};
