export type GroupStatus = 'In Discovery' | 'In Planning' | 'In Build' | 'In Test' | 'Done' | 'On Hold';
export type DiscoveryStatus = 'In Progress' | 'Locked' | 'Ready for Demand';
export type DemandStatus = 'Draft' | 'Ready for Crystal' | 'Approved';

export interface WorkGroup {
  id: number;
  name: string;
  description: string | null;
  status: GroupStatus;
  follow_up_flag: boolean;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkGroupDetail extends WorkGroup {
  discovery_forms: DiscoveryForm[];
  demand_forms: DemandForm[];
  work_items: { id: number; type: string; ticket_number: string; title: string; status: string; priority: string }[];
  journal_entries: (JournalEntrySummary & { ticket_number: string; item_title: string })[];
}

export interface DiscoveryForm {
  id: number;
  group_id: number;
  snwr_number: string | null;
  requester_name: string | null;
  requester_dept: string | null;
  their_process: string | null;
  expected_outcome: string | null;
  pain_points: string | null;
  ideal_method: string | null;
  your_interpretation: string | null;
  status: DiscoveryStatus;
  created_at: string;
  updated_at: string;
}

export interface DemandForm {
  id: number;
  group_id: number;
  discovery_form_id: number | null;
  business_case: string | null;
  assumptions: string | null;
  enablers: string | null;
  in_scope: string | null;
  out_of_scope: string | null;
  barriers: string | null;
  fixes: string | null;
  status: DemandStatus;
  created_at: string;
  updated_at: string;
}

export interface JournalEntrySummary {
  id: number;
  work_item_id: number;
  session_date: string;
  session_status: string;
  why: string | null;
}

export interface GroupReportRow {
  group: WorkGroup;
  journal_count: number;
  item_count: number;
  recent_updates: JournalEntrySummary[];
}

export interface GroupsReport {
  period: { start_date: string; end_date: string };
  active: GroupReportRow[];
  inactive: GroupReportRow[];
  summary: { total_groups: number; active_count: number };
}

export const GROUP_STATUSES: GroupStatus[] = ['In Discovery', 'In Planning', 'In Build', 'In Test', 'Done', 'On Hold'];
export const DISCOVERY_STATUSES: DiscoveryStatus[] = ['In Progress', 'Locked', 'Ready for Demand'];
export const DEMAND_STATUSES: DemandStatus[] = ['Draft', 'Ready for Crystal', 'Approved'];
