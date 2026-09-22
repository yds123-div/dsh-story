import { apiFetch } from './http';
import type {
  Asset,
  AssetListResponse,
  CreateProjectBody,
  CreateSegmentBody,
  CreditsResponse,
  Episode,
  EpisodeListResponse,
  ExportTaskBody,
  ModelListResponse,
  NotificationListResponse,
  NovelTaskBody,
  Outline,
  OutlineTaskBody,
  PatchSegmentBody,
  Project,
  ProjectListResponse,
  Segment,
  SegmentListResponse,
  StorageUsage,
  SubmitTaskResponse,
  TaskStatus,
  TemplateListResponse,
  VideoTaskBody,
  WorkflowState,
} from '../types/api';

export function listProjects(): Promise<ProjectListResponse> {
  return apiFetch('/api/projects');
}

export function createProject(body: CreateProjectBody): Promise<Project> {
  return apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(body) });
}

export function patchProject(id: string, body: { name: string }): Promise<Project> {
  return apiFetch(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function getCredits(): Promise<CreditsResponse> {
  return apiFetch('/api/credits');
}

/** 存储用量（mock 面；项目列表已切到真产品 API，用量暂不落库） */
export function getUsage(): Promise<StorageUsage> {
  return apiFetch('/api/usage');
}

export function submitOutlineTask(projectId: string, body: OutlineTaskBody): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/projects/${projectId}/outline-tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitNovelTask(projectId: string, body: NovelTaskBody): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/projects/${projectId}/novel-tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getTask(taskId: string): Promise<TaskStatus> {
  return apiFetch(`/api/tasks/${taskId}`);
}

export function getOutline(projectId: string): Promise<Outline> {
  return apiFetch(`/api/projects/${projectId}/outline`);
}

export function finalizeOutline(projectId: string): Promise<WorkflowState> {
  return apiFetch(`/api/projects/${projectId}/outline/finalize`, { method: 'POST' });
}

export function updateScreenplay(projectId: string, screenplay: string): Promise<Outline> {
  return apiFetch(`/api/projects/${projectId}/outline/screenplay`, {
    method: 'PATCH',
    body: JSON.stringify({ screenplay }),
  });
}

export function getWorkflow(projectId: string): Promise<WorkflowState> {
  return apiFetch(`/api/projects/${projectId}/workflow`);
}

export function listAssets(projectId: string): Promise<AssetListResponse> {
  return apiFetch(`/api/projects/${projectId}/assets`);
}

export function submitAssetImageTask(assetId: string): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/assets/${assetId}/image-tasks`, { method: 'POST' });
}

export function patchAsset(assetId: string, body: { consistencyLocked?: boolean; currentAlt?: number }): Promise<Asset> {
  return apiFetch(`/api/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function completeAssets(projectId: string): Promise<WorkflowState> {
  return apiFetch(`/api/projects/${projectId}/assets/complete`, { method: 'POST' });
}

export function submitEpisodeSplitTask(projectId: string): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/projects/${projectId}/episode-split-tasks`, { method: 'POST' });
}

export function listEpisodes(projectId: string): Promise<EpisodeListResponse> {
  return apiFetch(`/api/projects/${projectId}/episodes`);
}

export function getEpisode(episodeId: string): Promise<Episode> {
  return apiFetch(`/api/episodes/${episodeId}`);
}

export function listSegments(episodeId: string): Promise<SegmentListResponse> {
  return apiFetch(`/api/episodes/${episodeId}/segments`);
}

export function patchSegment(segmentId: string, body: PatchSegmentBody): Promise<Segment> {
  return apiFetch(`/api/segments/${segmentId}`, { method: 'PATCH', body: JSON.stringify(body) });
}

export function createSegment(episodeId: string, body: CreateSegmentBody): Promise<Segment> {
  return apiFetch(`/api/episodes/${episodeId}/segments`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitSegmentVideoTask(segmentId: string, body: VideoTaskBody): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/segments/${segmentId}/video-tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitEpisodeExportTask(episodeId: string, body: ExportTaskBody = {}): Promise<SubmitTaskResponse> {
  return apiFetch(`/api/episodes/${episodeId}/export-tasks`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function listModels(): Promise<ModelListResponse> {
  return apiFetch('/api/models');
}

export function listTemplates(): Promise<TemplateListResponse> {
  return apiFetch('/api/templates');
}

export function listNotifications(): Promise<NotificationListResponse> {
  return apiFetch('/api/notifications');
}

export type CreativeTaskBody = {
  kind: 'image' | 'video';
  prompt: string;
};

export function submitCreativeTask(body: CreativeTaskBody): Promise<SubmitTaskResponse> {
  return apiFetch('/api/creative-tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
