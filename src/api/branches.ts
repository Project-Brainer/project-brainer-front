import { http } from './client';
import type {
  Branch,
  BranchCommit,
  BranchDiff,
  BranchGraph,
  CreateBranchInput,
  MergeResult,
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

  getGraph(projectId: string, branchId: string): Promise<BranchGraph> {
    return http.get(`${br(projectId, branchId)}/graph`);
  },

  replaceGraph(projectId: string, branchId: string, body: ReplaceGraphBody): Promise<BranchGraph> {
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

  /**
   * Merge sourceBranchId INTO targetBranchId.
   * Backend: POST /branches/:sourceBranchId/merge  body: { targetBranchId }
   */
  merge(projectId: string, sourceBranchId: string, targetBranchId: string): Promise<MergeResult> {
    return http.post(`${br(projectId, sourceBranchId)}/merge`, { targetBranchId });
  },

  /**
   * Submit conflict resolutions to complete a merge.
   * Backend: POST /branches/:sourceBranchId/merge/resolve  body: ResolveMergeDto
   */
  resolveMerge(projectId: string, sourceBranchId: string, body: ResolveMergeInput): Promise<void> {
    return http.post(`${br(projectId, sourceBranchId)}/merge/resolve`, body);
  },
};
