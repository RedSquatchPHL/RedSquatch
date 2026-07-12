'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import WorkItemsTable, { WorkItem, WorkGroupOption } from '@/components/WorkItemsTable';
import WorkItemsTree, { Relationship } from '@/components/WorkItemsTree';
import WorkItemImportButton from '@/components/WorkItemImportButton';
import FilterPills from '@/components/FilterPills';
import CollapsibleFilterGroup from '@/components/CollapsibleFilterGroup';
import JournalPanel from '@/components/JournalPanel';
import HeaderBrand from '@/components/cenote/HeaderBrand';
import BottomToolbar from '@/components/cenote/BottomToolbar';
import styles from '@/styles/work.module.css';

const TYPE_LABELS: Record<string, string> = {
  DFCT: 'Defect',
  ENHC: 'Enhancement',
  RLSE: 'Release',
  SNWR: 'ServiceNow Request',
  STRY: 'Story',
  STSK: 'Scrum Task',
};

// Status is freeform text from the ServiceNow import (no fixed vocabulary), so match
// loosely rather than against one exact literal — catches "Closed", "Closed - Complete", etc.
function isClosed(item: WorkItem) {
  return (item.status ?? '').toLowerCase().includes('closed');
}

export default function WorkItemsPage() {
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [groups, setGroups] = useState<WorkGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [journalItem, setJournalItem] = useState<WorkItem | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'tree' | 'archive'>('table');
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const router = useRouter();

  function toggleExpanded(key: string) {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) router.push('/');
      })
      .catch(() => router.push('/'))
      .finally(() => setChecking(false));
  }, [router]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/client/work-items`, { credentials: 'include' });
      const data = await res.json();
      setItems(data.items ?? []);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    const res = await fetch(`${API}/api/client/groups`, { credentials: 'include' });
    if (res.ok) setGroups(await res.json());
  }

  async function loadRelationships() {
    const res = await fetch(`${API}/api/client/work-items/relationships`, { credentials: 'include' });
    if (res.ok) setRelationships(await res.json());
  }

  useEffect(() => {
    if (!checking) {
      loadItems();
      loadGroups();
      loadRelationships();
    }
  }, [checking]);

  async function handleLinkRelationship(parentId: number, childId: number) {
    await fetch(`${API}/api/client/work-items/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ parent_id: parentId, child_id: childId }),
    });
    loadRelationships();
  }

  async function handleUnlinkRelationship(relationshipId: number) {
    await fetch(`${API}/api/client/work-items/relationships/${relationshipId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    loadRelationships();
  }

  const { types, statuses, priorities } = useMemo(() => {
    const types = new Set<string>();
    const statuses = new Set<string>();
    const priorities = new Set<string>();
    for (const item of items) {
      types.add(item.type);
      statuses.add(item.status);
      priorities.add(item.priority);
    }
    return {
      types: Array.from(types).sort(),
      statuses: Array.from(statuses).sort(),
      priorities: Array.from(priorities).sort(),
    };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item =>
      !isClosed(item) &&
      (!typeFilter || item.type === typeFilter) &&
      (!statusFilter || item.status === statusFilter) &&
      (!priorityFilter || item.priority === priorityFilter)
    );
  }, [items, typeFilter, statusFilter, priorityFilter]);

  const closedItems = useMemo(() => items.filter(isClosed), [items]);

  async function handleUpdateSubmitter(id: number, submitter: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, submitter } : i)));
    await fetch(`${API}/api/client/work-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ submitter }),
    });
    setLastUpdated(new Date());
  }

  async function handleUpdateGroup(id: number, groupId: number | null) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, group_id: groupId } : i)));
    await fetch(`${API}/api/client/work-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ group_id: groupId }),
    });
    setLastUpdated(new Date());
  }

  async function handleUpdateStatus(id: number, status: string) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status } : i)));
    await fetch(`${API}/api/client/work-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    setLastUpdated(new Date());
  }

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/client/work-items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    setLastUpdated(new Date());
  }

  function toggle(setter: (v: string | null) => void, current: string | null, value: string) {
    setter(current === value ? null : value);
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: '#b87333' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={`work-page jungle-bg ${styles.workPage} pb-28`}>
      <div className="max-w-[1400px] mx-auto mb-6">
        <HeaderBrand version="7.4" showVersion />
      </div>
      <div className="flex min-h-screen">
        <div className={`${styles.content} flex-1 min-w-0`}>
          <header className={styles.header}>
            <h1 className={styles.title}>Work Items</h1>
            <p className={styles.subheader}>
              {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'} imported from ServiceNow`}
            </p>
          </header>

          <div className={styles.toolbar}>
            <WorkItemImportButton onImported={() => loadItems()} />
            <div className="flex border border-[rgba(184,115,51,0.3)]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`text-xs px-3 py-1.5 ${viewMode === 'table' ? 'bg-[rgba(184,115,51,0.2)] text-[#d4a373]' : 'text-white/40'}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`text-xs px-3 py-1.5 ${viewMode === 'tree' ? 'bg-[rgba(184,115,51,0.2)] text-[#d4a373]' : 'text-white/40'}`}
              >
                Tree
              </button>
              <button
                type="button"
                onClick={() => setViewMode('archive')}
                className={`text-xs px-3 py-1.5 ${viewMode === 'archive' ? 'bg-[rgba(184,115,51,0.2)] text-[#d4a373]' : 'text-white/40'}`}
              >
                Archive ({closedItems.length})
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
            <div className={styles.filterSidebarCol}>
              <div className={styles.filterSidebar}>
                <CollapsibleFilterGroup title="Type" expanded={expandedFilters.has('type')} onToggle={() => toggleExpanded('type')}>
                  <FilterPills options={types} active={typeFilter} onToggle={v => toggle(setTypeFilter, typeFilter, v)} labels={TYPE_LABELS} />
                </CollapsibleFilterGroup>
                <CollapsibleFilterGroup title="Status" expanded={expandedFilters.has('status')} onToggle={() => toggleExpanded('status')}>
                  <FilterPills options={statuses} active={statusFilter} onToggle={v => toggle(setStatusFilter, statusFilter, v)} />
                </CollapsibleFilterGroup>
                <CollapsibleFilterGroup title="Priority" expanded={expandedFilters.has('priority')} onToggle={() => toggleExpanded('priority')}>
                  <FilterPills options={priorities} active={priorityFilter} onToggle={v => toggle(setPriorityFilter, priorityFilter, v)} />
                </CollapsibleFilterGroup>
              </div>
            </div>
          )}

          {viewMode === 'table' && (
            <WorkItemsTable
              items={filtered}
              groups={groups}
              onUpdateSubmitter={handleUpdateSubmitter}
              onUpdateGroup={handleUpdateGroup}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              onOpenJournal={setJournalItem}
            />
          )}

          {viewMode === 'tree' && (
            <WorkItemsTree
              items={filtered}
              relationships={relationships}
              onLink={handleLinkRelationship}
              onUnlink={handleUnlinkRelationship}
            />
          )}

          {viewMode === 'archive' && (
            <WorkItemsTable
              items={closedItems}
              groups={groups}
              onUpdateSubmitter={handleUpdateSubmitter}
              onUpdateGroup={handleUpdateGroup}
              onUpdateStatus={handleUpdateStatus}
              onDelete={handleDelete}
              onOpenJournal={setJournalItem}
            />
          )}

          <footer className={styles.footer}>
            {lastUpdated && `Last updated: ${lastUpdated.toLocaleString()}`}
          </footer>
        </div>

        {journalItem && (
          <JournalPanel
            workItemId={journalItem.id}
            workItemLabel={`${journalItem.ticket_number} — ${journalItem.title}`}
            groups={groups}
            onClose={() => setJournalItem(null)}
          />
        )}
      </div>

      <BottomToolbar activeItem="work" />
    </div>
  );
}
