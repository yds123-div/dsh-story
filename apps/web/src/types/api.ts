export type ProjectStatus = 'in_progress' | 'archived';

export type Project = {
  id: string;
  name: string;
  coverUrl: string | null;
  updatedAt: string;
  status: ProjectStatus;
  statusText: string;
  assetCount: number;
  characterCount: number;
  sceneCount: number;
  segmentCount: number;
  durationSec: number;
  creditBalance: number;
  aspectRatio: string;
  style: string;
};

export type StorageUsage = {
  usedBytes: number;
  quotaBytes: number;
  retentionDays: number;
};

export type ProjectListResponse = {
  projects: Project[];
  storage: StorageUsage;
};

export type CreateProjectBody = {
  name: string;
  templateId?: string;
  aspectRatio?: string;
  style?: string;
};

export type CreditsResponse = {
  balance: number;
};

export type TaskStatusName = 'pending' | 'running' | 'succeeded' | 'failed';

export type TaskStatus = {
  taskId: string;
  status: TaskStatusName;
  progress: number;
  result?: unknown;
  error?: string;
};

export type SubmitTaskResponse = {
  taskId: string;
};

export type OutlineTaskBody = {
  sourceType: 'paste' | 'file';
  text?: string;
  fileName?: string;
};

export type NovelTaskBody = {
  sourceType: 'paste' | 'file';
  text?: string;
  fileName?: string;
};

export type WorkflowStep = 1 | 2 | 3;

export type WorkflowState = {
  projectId: string;
  unlockedStep: WorkflowStep;
  outlineFinalized: boolean;
  assetsCompleted: boolean;
};

export type OutlineSetting = {
  videoStyle: string;
  aspectRatio: string;
  resolution: string;
  model: string;
};

export type OutlineSummary = {
  protagonists: string;
  genre: string;
  synopsis: string;
  background: string;
  setting: string;
};

export type AssetType = 'character' | 'scene' | 'prop' | 'material';

export type AssetAlt = {
  name: string;
  imageUrl: string;
  filter?: string;
};

export type Asset = {
  id: string;
  projectId: string;
  type: AssetType;
  name: string;
  role: string;
  description: string;
  imageUrl: string | null;
  emoji: string | null;
  consistencyLocked: boolean;
  status: 'pending' | 'ready';
  alts?: AssetAlt[];
  currentAlt?: number;
  refs?: string[];
};

export type Outline = {
  projectId: string;
  projectName: string;
  finalized: boolean;
  setting: OutlineSetting;
  summary: OutlineSummary;
  extractedAssets: Asset[];
  screenplayTitle: string;
  screenplay: string;
};

export type EpisodeSegmentSummary = {
  no: number;
  title: string;
  durationSec: number;
};

export type Episode = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  status: 'split' | 'draft';
  segmentCount: number;
  durationSec: number;
  coverUrl: string | null;
  summary: string;
  segments: EpisodeSegmentSummary[];
};

export type AssetListResponse = {
  assets: Asset[];
};

export type EpisodeListResponse = {
  episodes: Episode[];
};

export type ModelId = 'seedance-2.5' | 'minimax-h3-max' | 'wan-3.0';

export type Model = {
  id: ModelId;
  name: string;
};

export type ModelListResponse = {
  models: Model[];
};

export type Shot = {
  id: string;
  durationSec: number;
  shotType: string;
  camera: string;
  action: string;
  speaker: string;
  voice: string;
  line: string;
};

export type Segment = {
  id: string;
  episodeId: string;
  projectId: string;
  no: number;
  title: string;
  durationSec: number;
  generated: boolean;
  videoUrl: string | null;
  prompt: string;
  shots: Shot[];
  model: ModelId | null;
  charCount: number;
};

export type SegmentListResponse = {
  segments: Segment[];
};

export type PatchSegmentBody = {
  prompt?: string;
  shots?: Shot[];
  title?: string;
};

export type CreateSegmentBody = {
  prompt: string;
  durationSec: number;
  title: string;
};

export type VideoTaskBody = {
  model: ModelId;
};

export type ExportTaskBody = {
  resolution?: string;
  format?: string;
  watermark?: string;
};

export type Template = {
  id: string;
  name: string;
  subtitle: string;
  tags: string[];
  coverUrl: string;
  coverFilter: string;
  scriptText: string;
  style: string;
  aspectRatio: string;
};

export type TemplateListResponse = {
  templates: Template[];
};

export type AppNotification = {
  id: string;
  icon: string;
  title: string;
  time: string;
  read: boolean;
};

export type NotificationListResponse = {
  notifications: AppNotification[];
};

export type PlazaAssetCategory = 'character' | 'scene' | 'video' | 'material';

export type PlazaAsset = {
  id: string;
  category: PlazaAssetCategory;
  name: string;
  imageUrl: string | null;
  videoUrl: string | null;
  height: number;
  meta: string;
  tag: 'ai' | 'upload';
  filter?: string;
};

export type PlazaCategory = 'all' | 'character' | 'scene' | 'video' | 'material' | 'upload';
