import { http } from './client';
import type { ProjectGraph, ReplaceGraphBody } from './types';

export const graphApi = {
  get: (projectId: string) => http.get<ProjectGraph>(`/projects/${projectId}/graph`),
  replace: (projectId: string, body: ReplaceGraphBody) =>
    http.put<ProjectGraph>(`/projects/${projectId}/graph`, body),
  exportJson: (projectId: string) =>
    http.get<ProjectGraph>(`/projects/${projectId}/export`),
  importJson: (projectId: string, body: ReplaceGraphBody) =>
    http.post<ProjectGraph>(`/projects/${projectId}/import`, body),
};
