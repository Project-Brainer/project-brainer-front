import { http } from './client';
import type { PromptRequestBody, PromptResponse } from './types';

export const promptApi = {
  generate: (projectId: string, body: PromptRequestBody = {}) =>
    http.post<PromptResponse>(`/projects/${projectId}/prompt`, body),
};
