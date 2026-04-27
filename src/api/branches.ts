import { http } from './client';
import type {
  Branch,
  BranchCommit,
  BranchDiff,
  CreateBranchInput,
  MergeResult,
  ProjectGraph,
  ReplaceGraphBody,
  ResolveMergeInput,
} from './types';

const base = (projectId: string) => `/projects/${projectId}/branches`;
const br = (projectId: string, branchId: string) => `${base(projectId)}/${branchId}`;

export const branchesApi = {
  list(projectId: string): Promise<Branch[]> {
    return http.get(`${base(projectId)}`);
  },

  create(projectId: string, input: CreateBranchInput): Promise<Branch> {
    return http.post(`${base(projectId)}`, input);
  },

  get(projectId: string, branchId: string): Promise<Branch> {
    return http.get(`${br(projectId, branchId)}`);
  },

  remove(projectId: string, branchId: string): Promise<void> {
    return http.del(`${br(projectId, branchId)}`);
  },

  getGraph(projectId: string, branchId: string): Promise<ProjectGraph> {
    return http.get(`${br(projectId, branchId)}/graph`);
  },

  replaceGraph(projectId: string, branchId: string, body: ReplaceGraphBody): Promise<ProjectGraph> {
    return http.post(`${br(projectId, branchId)}/graph`, body);
  },

  getDiff(projectId: string, branchId: string): Promise<BranchDiff> {
    return http.get(`${br(projectId, branchId)}/diff`);
  },

  listCommits(projectId: string, branchId: string): Promise<BranchCommit[]> {
    return http.get(`${br(projectId, branchId)}/commits`);
  },

  createCommit(projectId: string, branchId: string, message: string): Promise<BranchCommit> {
    return http.post(`${br(projectId, branchId)}/commits`, { message });
  },

  merge(projectId: string, branchId: string, sourceBranchId: string): Promise<MergeResult> {
    return http.post(`${br(projectId, branchId)}/merge`, { sourceBranchId });
  },

  resolveMerge(projectId: string, branchId: string, body: ResolveMergeInput): Promise<void> {
    return http.post(`${br(projectId, branchId)}/merge/resolve`, body);
  },
};
