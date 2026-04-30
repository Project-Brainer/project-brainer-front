import { http } from './client';
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from './types';

export const projectsApi = {
  list: () => http.get<Project[]>('/projects'),
  get: (id: string) => http.get<Project>(`/projects/${id}`),
  create: (input: CreateProjectInput) => http.post<Project>('/projects', input),
  update: (id: string, input: UpdateProjectInput) =>
    http.patch<Project>(`/projects/${id}`, input),
  remove: (id: string) => http.del(`/projects/${id}`),
};
