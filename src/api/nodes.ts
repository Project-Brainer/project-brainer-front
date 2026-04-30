import { http } from './client';
import type {
  AnyNode,
  CreateNodeInput,
  NodeType,
  UpdateNodeInput,
} from './types';

export const nodesApi = {
  list: (projectId: string) => http.get<AnyNode[]>(`/projects/${projectId}/nodes`),
  create: <T extends NodeType>(projectId: string, input: CreateNodeInput<T>) =>
    http.post<AnyNode>(`/projects/${projectId}/nodes`, input),
  update: (projectId: string, nodeId: string, input: UpdateNodeInput) =>
    http.patch<AnyNode>(`/projects/${projectId}/nodes/${nodeId}`, input),
  remove: (projectId: string, nodeId: string) =>
    http.del(`/projects/${projectId}/nodes/${nodeId}`),
};
