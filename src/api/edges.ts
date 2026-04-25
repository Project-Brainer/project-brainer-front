import { http } from './client';
import type { CreateEdgeInput, Edge, UpdateEdgeInput } from './types';

export const edgesApi = {
  list: (projectId: string) => http.get<Edge[]>(`/projects/${projectId}/edges`),
  create: (projectId: string, input: CreateEdgeInput) =>
    http.post<Edge>(`/projects/${projectId}/edges`, input),
  update: (projectId: string, edgeId: string, input: UpdateEdgeInput) =>
    http.patch<Edge>(`/projects/${projectId}/edges/${edgeId}`, input),
  remove: (projectId: string, edgeId: string) =>
    http.del(`/projects/${projectId}/edges/${edgeId}`),
};
