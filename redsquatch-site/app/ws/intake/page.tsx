'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import GroupsList from '@/components/intake/GroupsList';
import GroupForm from '@/components/intake/GroupForm';
import DiscoveryForm from '@/components/intake/DiscoveryForm';
import DemandForm from '@/components/intake/DemandForm';
import CopperPanel from '@/components/cenote/CopperPanel';
import type { WorkGroup, DiscoveryForm as DiscoveryFormType, GroupStatus } from '@/components/intake/types';

export default function WSIntakePage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [currentDiscovery, setCurrentDiscovery] = useState<DiscoveryFormType | null>(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WorkGroup | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/client/session`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) router.push('/');
      })
      .catch(() => router.push('/'))
      .finally(() => setChecking(false));
  }, [router]);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch(`${API}/api/client/groups`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load groups');
      setGroups(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => { if (!checking) fetchGroups(); }, [checking, fetchGroups]);
  useEffect(() => { setCurrentDiscovery(null); }, [selectedGroupId]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  const handleCreateGroup = () => { setEditingGroup(null); setShowGroupForm(true); };
  const handleEditGroup = () => { if (selectedGroup) { setEditingGroup(selectedGroup); setShowGroupForm(true); } };

  const handleSaveGroup = async (data: {
    name: string;
    description: string;
    status: GroupStatus;
    follow_up_flag: boolean;
    follow_up_date: string | null;
  }) => {
    const url = editingGroup ? `${API}/api/client/groups/${editingGroup.id}` : `${API}/api/client/groups`;
    const method = editingGroup ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to save group');
    }
    const saved = await res.json();
    setShowGroupForm(false);
    setEditingGroup(null);
    await fetchGroups();
    if (!editingGroup) setSelectedGroupId(saved.id);
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Delete this group and all its discovery/demand forms?')) return;
    try {
      const res = await fetch(`${API}/api/client/groups/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete group');
      if (selectedGroupId === id) setSelectedGroupId(null);
      await fetchGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#b87333] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-6">
          <h1 className="text-4xl text-[#b87333]">Work Intake</h1>
          <p className="text-[#d4a373] text-sm mt-1">Discovery and Demand, side by side.</p>
        </div>

        {error && (
          <p className="text-red-400 text-sm border border-red-400/20 bg-red-400/5 px-3 py-2 mb-4">{error}</p>
        )}

        <CopperPanel>
          <div className="flex flex-col md:flex-row min-h-[600px]">
            {/* Group rail */}
            <div className="w-full md:w-64 md:border-r border-b md:border-b-0 border-[rgba(184,115,51,0.2)] max-h-[300px] md:max-h-none shrink-0">
              <GroupsList
                groups={groups}
                loading={groupsLoading}
                selectedGroupId={selectedGroupId}
                onSelect={setSelectedGroupId}
                onNew={handleCreateGroup}
                onDelete={handleDeleteGroup}
              />
            </div>

            {/* Split-pane forms */}
            <div className="flex-1 p-6 min-w-0">
              {!selectedGroup ? (
                <div className="flex items-center justify-center h-full min-h-[400px] text-white/40 text-sm">
                  Select a group, or create a new one, to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-2xl text-white">{selectedGroup.name}</h2>
                      {selectedGroup.description && (
                        <p className="text-white/40 text-sm mt-1">{selectedGroup.description}</p>
                      )}
                    </div>
                    <button
                      onClick={handleEditGroup}
                      className="text-xs border border-[rgba(184,115,51,0.3)] text-[#d4a373] hover:bg-[rgba(184,115,51,0.1)] px-3 py-1.5"
                    >
                      Edit Group
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="lg:border-r border-[rgba(184,115,51,0.15)] lg:pr-8">
                      <DiscoveryForm groupId={selectedGroup.id} onFormReady={setCurrentDiscovery} />
                    </div>
                    <div>
                      <DemandForm groupId={selectedGroup.id} discoveryForm={currentDiscovery} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CopperPanel>
      </div>

      {showGroupForm && (
        <GroupForm
          group={editingGroup}
          onClose={() => { setShowGroupForm(false); setEditingGroup(null); }}
          onSave={handleSaveGroup}
        />
      )}
    </div>
  );
}
