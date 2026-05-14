import { http } from './client';
import type { CreatePageInput, Page, UpdatePageInput } from './types';

export const pagesApi = {
  list: (projectId: string) =>
    http.get<Page[]>(`/projects/${projectId}/pages`),

  create: (projectId: string, input: CreatePageInput) =>
    http.post<Page>(`/projects/${projectId}/pages`, input),

  update: (projectId: string, pageId: string, input: UpdatePageInput) =>
    http.patch<Page>(`/projects/${projectId}/pages/${pageId}`, input),

  remove: (projectId: string, pageId: string) =>
    http.del(`/projects/${projectId}/pages/${pageId}`),
};
