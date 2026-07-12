'use client';

import { useMemo, useState } from 'react';
import TypeBadge from '@/components/TypeBadge';
import type { WorkItem } from '@/components/WorkItemsTable';

export type Relationship = {
  id: number;
  parent_id: number;
  child_id: number;
  relationship_type: string | null;
};

export default function WorkItemsTree({
  items,
  relationships,
  onLink,
  onUnlink,
}: {
  items: WorkItem[];
  relationships: Relationship[];
  onLink: (parentId: number, childId: number) => void;
  onUnlink: (relationshipId: number) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [linkingFor, setLinkingFor] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  function selectRow(id: number) {
    setSelectedId(prev => (prev === id ? null : id));
    setLinkingFor(null);
  }

  const { childrenOf, relByPair, childIds } = useMemo(() => {
    const childrenOf = new Map<number, number[]>();
    const relByPair = new Map<string, number>();
    const childIds = new Set<number>();
    for (const r of relationships) {
      if (!childrenOf.has(r.parent_id)) childrenOf.set(r.parent_id, []);
      childrenOf.get(r.parent_id)!.push(r.child_id);
      relByPair.set(`${r.parent_id}:${r.child_id}`, r.id);
      childIds.add(r.child_id);
    }
    return { childrenOf, relByPair, childIds };
  }, [relationships]);

  const itemsById = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);
  const roots = useMemo(() => items.filter(i => !childIds.has(i.id)), [items, childIds]);

  function toggle(id: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNode(item: WorkItem, depth: number, ancestry: Set<number>) {
    const children = (childrenOf.get(item.id) ?? []).map(id => itemsById.get(id)).filter(Boolean) as WorkItem[];
    const isExpanded = expanded.has(item.id);
    const linkCandidates = items.filter(
      i => i.id !== item.id && !ancestry.has(i.id) && !childIds.has(i.id)
    );

    const isSelected = selectedId === item.id;

    return (
      <div key={item.id} style={{ marginLeft: depth * 20 }} className="border-l border-[rgba(184,115,51,0.15)] pl-3 py-1">
        <div
          onClick={() => selectRow(item.id)}
          className={`flex items-center gap-2 cursor-pointer px-1.5 py-1 rounded ${
            isSelected ? 'bg-[rgba(184,115,51,0.14)] border border-[rgba(184,115,51,0.4)]' : 'border border-transparent hover:bg-[rgba(184,115,51,0.05)]'
          }`}
        >
          {children.length > 0 ? (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); toggle(item.id); }}
              className="text-[#d4a373] text-xs w-4"
            >
              {isExpanded ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <TypeBadge type={item.type} />
          <span className="text-white/80 text-xs font-mono">{item.ticket_number}</span>
          <span className="text-white/60 text-sm">{item.title}</span>
          {isSelected && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setLinkingFor(linkingFor === item.id ? null : item.id); }}
              className="text-xs text-[#d4a373] hover:underline ml-auto"
            >
              + Add child
            </button>
          )}
        </div>

        {linkingFor === item.id && (
          <div className="ml-6 mt-1">
            <select
              autoFocus
              defaultValue=""
              onChange={e => {
                if (e.target.value) {
                  onLink(item.id, Number(e.target.value));
                  setLinkingFor(null);
                }
              }}
              className="bg-[#0f0f0f] border border-[rgba(184,115,51,0.3)] text-white text-xs px-2 py-1"
            >
              <option value="" disabled>Select item...</option>
              {linkCandidates.map(c => (
                <option key={c.id} value={c.id}>{c.ticket_number} — {c.title}</option>
              ))}
            </select>
          </div>
        )}

        {isExpanded && children.map(child => {
          const relId = relByPair.get(`${item.id}:${child.id}`);
          return (
            <div key={child.id} className="relative">
              {renderNode(child, depth + 1, new Set(Array.from(ancestry).concat(item.id)))}
              {relId !== undefined && (
                <button
                  type="button"
                  onClick={() => onUnlink(relId)}
                  className="absolute top-1 right-0 text-xs text-white/30 hover:text-red-400"
                  title="Unlink"
                  style={{ marginLeft: (depth + 1) * 20 }}
                >
                  ✕ unlink
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="glass-surface p-4 space-y-1">
      {roots.length === 0 && <p className="text-white/40 text-sm">No work items to display.</p>}
      {roots.map(item => renderNode(item, 0, new Set()))}
    </div>
  );
}
