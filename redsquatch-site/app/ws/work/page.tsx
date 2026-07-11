'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import WorkItemsTable, { WorkItem } from '@/components/WorkItemsTable';
import WorkItemImportButton from '@/components/WorkItemImportButton';
import FilterPills from '@/components/FilterPills';
import styles from '@/styles/work.module.css';

export default function WorkItemsPage() {
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const router = useRouter();

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

  useEffect(() => {
    if (!checking) loadItems();
  }, [checking]);

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
      (!typeFilter || item.type === typeFilter) &&
      (!statusFilter || item.status === statusFilter) &&
      (!priorityFilter || item.priority === priorityFilter)
    );
  }, [items, typeFilter, statusFilter, priorityFilter]);

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
    <div className={`work-page ${styles.workPage}`}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Work Items</h1>
          <p className={styles.subheader}>
            {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'} imported from ServiceNow`}
          </p>
        </header>

        <div className={styles.toolbar}>
          <WorkItemImportButton onImported={() => loadItems()} />
          <div className={styles.filterRow}>
            <FilterPills label="Type" options={types} active={typeFilter} onToggle={v => toggle(setTypeFilter, typeFilter, v)} />
            <FilterPills label="Status" options={statuses} active={statusFilter} onToggle={v => toggle(setStatusFilter, statusFilter, v)} />
            <FilterPills label="Priority" options={priorities} active={priorityFilter} onToggle={v => toggle(setPriorityFilter, priorityFilter, v)} />
          </div>
        </div>

        <WorkItemsTable items={filtered} onUpdateSubmitter={handleUpdateSubmitter} onDelete={handleDelete} />

        <footer className={styles.footer}>
          {lastUpdated && `Last updated: ${lastUpdated.toLocaleString()}`}
        </footer>
      </div>
    </div>
  );
}
