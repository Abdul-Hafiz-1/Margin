/**
 * MARGIN — Type Definitions
 * Living Context Engine, Hybrid AI, Spaces, Records, Relationships, and Continuity.
 */

export type RecordType = 'observation' | 'decision' | 'event' | 'hypothesis' | 'action';

export type RecordStatus = 'active' | 'resolved' | 'superseded' | 'archived';

export type RecordSource = 'user' | 'ai_suggested' | 'voice' | 'system';

export type RelationshipType = 
  | 'supports' 
  | 'contradicts' 
  | 'caused_by' 
  | 'related_to' 
  | 'supersedes' 
  | 'depends_on' 
  | 'resolves';

export interface RecordAuthor {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface RecordVersionHistory {
  version: number;
  title: string;
  content: string;
  updatedAt: number;
  updatedBy: RecordAuthor;
  changeSummary?: string;
}

export interface RecordAIMetadata {
  confidence?: number;
  inferenceMode: 'on_device' | 'in_cloud' | 'deterministic_fallback';
  model?: string;
  extractedAt: number;
  rawExcerpt?: string;
}

export interface MarginRecord {
  id: string;
  spaceId: string;
  type: RecordType;
  title: string;
  content: string;
  status: RecordStatus;
  author: RecordAuthor;
  createdAt: number;
  updatedAt: number;
  source: RecordSource;
  supportingRecordIds: string[];
  tags: string[];
  version: number;
  aiMetadata?: RecordAIMetadata;
  history?: RecordVersionHistory[];
  syncStatus?: 'local' | 'syncing' | 'synced' | 'conflict' | 'error';
}

export interface RecordRelationship {
  id: string;
  spaceId: string;
  sourceRecordId: string;
  targetRecordId: string;
  type: RelationshipType;
  provenance: 'user' | 'ai_detected';
  explanation?: string;
  createdAt: number;
}

export type SpaceRole = 'owner' | 'editor' | 'viewer';

export interface SpaceMember {
  userId: string;
  name: string;
  email: string;
  role: SpaceRole;
  joinedAt: number;
}

export interface Space {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  type: 'personal' | 'shared';
  members: SpaceMember[];
  memberIds?: string[];
  roles?: Record<string, SpaceRole>;
  createdAt: number;
  updatedAt: number;
  isArchived?: boolean;
  color?: string;
  stats?: {
    recordCount: number;
    unresolvedCount: number;
    lastActivityAt: number;
  };
}

export interface RelayBriefing {
  id: string;
  spaceId: string;
  createdAt: number;
  createdBy: RecordAuthor;
  objective: string;
  currentState: string;
  recentEvents: Array<{ title: string; recordId: string; timestamp: number }>;
  keyDecisions: Array<{ title: string; reasoning: string; recordId: string }>;
  verifiedObservations: Array<{ title: string; content: string; recordId: string }>;
  unresolvedHypotheses: Array<{ title: string; hypothesis: string; recordId: string }>;
  outstandingActions: Array<{ title: string; assignee?: string; recordId: string }>;
  suggestedNextSteps: string[];
  selectedRecordIds: string[];
  status: 'draft' | 'finalized';
  sharedWithUserIds?: string[];
  inferenceModeUsed?: string;
}

export interface ReEntryBriefing {
  spaceId: string;
  generatedAt: number;
  whereLeftOff: string;
  whatChanged: string[];
  unresolvedItems: string[];
  recommendedNextAction: string;
  relevantRecordIds: string[];
  inferenceMode: 'on_device' | 'in_cloud' | 'deterministic_fallback';
}

export interface AIOperationLog {
  id: string;
  operationType: 'extraction' | 'synthesis' | 'contradiction_check' | 'relay_generation' | 're_entry';
  inferenceMode: 'on_device' | 'in_cloud' | 'deterministic_fallback';
  model: string;
  status: 'success' | 'fallback' | 'failed';
  timestamp: number;
  inputReferences: string[];
  outputReferences: string[];
  latencyMs?: number;
  error?: string;
}

export interface ActivityItem {
  id: string;
  spaceId: string;
  recordId?: string;
  type: 'record_created' | 'record_updated' | 'record_resolved' | 'relationship_created' | 'relay_generated' | 're_entry_viewed';
  recordType?: RecordType;
  title: string;
  detail: string;
  actor: RecordAuthor;
  timestamp: number;
}
