'use client';
import { useState, useEffect } from 'react';
import { API } from '@/lib/api';

export type ItemType = 'demand' | 'enhancement' | 'story' | 'scrum_task' | 'defect';

export interface WorkItem {
  id: string; title: string; item_type: ItemType; status: string;
  priority: string; owner: string | null; days_inactive: number;
  last_activity_at: string; created_at: string;
  number?: string; item_state?: string;
  // demand
  name?: string; category?: string; demand_type?: string; enhancement_number?: string;
  description?: string; business_value?: string; requested_by?: string;
  due_date?: string; estimated_effort?: string; collaborators?: string;
  demand_state?: string;
  business_case?: string; risk_of_performing?: string; risk_of_not_performing?: string;
  enablers?: string; barriers?: string; in_scope?: string; out_of_scope?: string;
  assumptions?: string; notes?: string;
  // enhancement
  current_state?: string; desired_state?: string; impact?: string;
  affected_systems?: string; business_justification?: string;
  enhancement_state?: string; demand_id?: string;
  // story
  as_a?: string; i_want?: string; so_that?: string;
  acceptance_criteria?: string; story_points?: number; sprint?: string;
  story_state?: string; story_type?: string; enhancement_id?: string;
  // scrum_task
  assigned_to?: string; hours_worked?: number; planned_hours?: number;
  percent_complete?: number; start_date?: string; end_date?: string;
  story_id?: string; task_state?: string; task_type?: string;
  // defect
  reproduction_steps?: string; severity?: string; environment?: string;
  root_cause?: string; resolution?: string; version_found?: string;
  defect_state?: string; reported_against?: string;
}

// ── Enum constants ─────────────────────────────────────────────────────────────

const DEMAND_STATES     = ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'On Hold', 'Cancelled', 'Closed'];
const ENHANCEMENT_STATES = ['Draft', 'Scoping', 'Awaiting Approval', 'Work in Progress', 'Testing/QA', 'Deployment', 'On Hold', 'Canceled', 'Closed'];
const STORY_STATES      = ['Copy', 'Requirements Review', 'Draft', 'On Hold', 'Ready', 'Work In Progress', 'Testing', 'Testing Complete', 'Ready for Demo', 'Change Request Submitted', 'Change Request Approved', 'Completed', 'Cancelled'];
const STORY_TYPES       = ['Admin', 'Design', 'Development', 'Documentation', 'Gather Requirements', 'Implementation', 'Spike', 'Testing'];
const TASK_STATES       = ['Draft', 'Ready', 'Work in Progress', 'Complete'];
const TASK_TYPES        = ['Analysis', 'Coding', 'Documentation', 'Testing'];
const DEFECT_STATES     = ['Draft', 'Scoping', 'Awaiting Approval', 'Work in Progress', 'Testing/QA', 'Deploy/Launch', 'Closed Complete', 'On Hold', 'Cancelled'];
const DEFECT_ENVS       = ['Prod', 'Dev', 'Test', 'CD', 'Sandbox'];

const TYPES: { key: ItemType; label: string; color: string }[] = [
  { key: 'demand',      label: 'Demand',      color: '#b87333' },
  { key: 'enhancement', label: 'Enhancement', color: '#9c5fd4' },
  { key: 'story',       label: 'Story',       color: '#14b8a6' },
  { key: 'scrum_task',  label: 'Scrum Task',  color: '#e8891a' },
  { key: 'defect',      label: 'Defect',      color: '#dc2626' },
];

interface LinkOption { id: string; title: string; number?: string; }

const BLANK_FORM = {
  title: '', priority: 'medium', owner: '', number: '',
  // demand core
  name: '', category: '', demand_type: '', enhancement_number: '',
  description: '', business_value: '', requested_by: '', due_date: '', estimated_effort: '',
  demand_state: 'Draft', collaborators: '',
  // demand business analysis
  business_case: '', risk_of_performing: '', risk_of_not_performing: '',
  enablers: '', barriers: '', in_scope: '', out_of_scope: '', assumptions: '', notes: '',
  // enhancement
  current_state: '', desired_state: '', impact: '', affected_systems: '', business_justification: '',
  enhancement_state: 'Draft', demand_id: '',
  // story
  as_a: '', i_want: '', so_that: '', acceptance_criteria: '', story_points: '', sprint: '',
  story_state: 'Draft', story_type: 'Development', enhancement_id: '',
  // scrum_task
  assigned_to: '', hours_worked: '', planned_hours: '', percent_complete: '0',
  start_date: '', end_date: '', story_id: '',
  task_state: 'Draft', task_type: 'Coding',
  // defect
  reproduction_steps: '', severity: 'medium', environment: '', root_cause: '', resolution: '', version_found: '',
  defect_state: 'Draft', reported_against: '',
};

interface Props {
  editItem?: WorkItem | null;
  lockType?: ItemType;
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">
        {label}{required && <span style={{ color: '#b87333' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ── Rich text editor (edit textarea / preview HTML) ───────────────────────────

function RichTextArea({ value, onChange, rows = 6, placeholder }: {
  value: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  const [preview, setPreview] = useState(false);
  const inputCls = 'glass-input w-full rounded-lg px-3 py-2 text-sm resize-none';
  return (
    <div>
      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => setPreview(false)}
          className="text-[10px] px-2 py-0.5 rounded border transition-colors"
          style={{
            borderColor: !preview ? 'rgba(184,115,51,0.6)' : 'rgba(255,255,255,0.1)',
            color: !preview ? '#b87333' : 'rgba(255,255,255,0.35)',
            background: !preview ? 'rgba(184,115,51,0.10)' : 'transparent',
          }}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setPreview(true)}
          className="text-[10px] px-2 py-0.5 rounded border transition-colors"
          style={{
            borderColor: preview ? 'rgba(184,115,51,0.6)' : 'rgba(255,255,255,0.1)',
            color: preview ? '#b87333' : 'rgba(255,255,255,0.35)',
            background: preview ? 'rgba(184,115,51,0.10)' : 'transparent',
          }}
        >
          Preview
        </button>
      </div>
      {preview ? (
        <div
          className={inputCls}
          style={{ minHeight: `${rows * 1.5}rem`, overflowY: 'auto' }}
          dangerouslySetInnerHTML={{
            __html: value || '<em style="opacity:0.35">Nothing to preview yet</em>',
          }}
        />
      ) : (
        <textarea
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputCls}
        />
      )}
    </div>
  );
}

// ── Number field with copper warning when empty ───────────────────────────────

function NumberField({ value, onChange, cls }: { value: string; onChange: (v: string) => void; cls: string }) {
  return (
    <Field label="Number">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Assign tracking number…"
          className={cls}
          style={!value ? {
            background: 'rgba(184,115,51,0.10)',
            borderColor: 'rgba(184,115,51,0.50)',
          } : undefined}
        />
        {!value && (
          <span
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold pointer-events-none"
            style={{ color: '#b87333' }}
          >
            ⚠ Pending
          </span>
        )}
      </div>
    </Field>
  );
}

// ── Link field (parent item dropdown) ─────────────────────────────────────────

function LinkField({ label, options, value, onChange, cls }: {
  label: string; options: LinkOption[]; value: string; onChange: (v: string) => void; cls: string;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)} className={cls}>
        <option value="">— None —</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.number ? `[${o.number}] ` : ''}{o.title}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ── Demand accordion panel ────────────────────────────────────────────────────

function AccordionPanel({
  title, isOpen, onToggle, hasRequired, children,
}: {
  title: string; isOpen: boolean; onToggle: () => void;
  hasRequired?: boolean; children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        border: isOpen ? '1px solid rgba(184,115,51,0.38)' : '1px solid rgba(184,115,51,0.14)',
        transition: 'border-color 0.2s ease',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        style={{
          background: isOpen ? 'rgba(184,115,51,0.09)' : 'rgba(255,255,255,0.02)',
          transition: 'background 0.2s ease',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-semibold"
            style={{ color: isOpen ? '#d4a373' : 'rgba(255,255,255,0.55)', transition: 'color 0.2s ease' }}
          >
            {title}
          </span>
          {hasRequired && (
            <span
              title="Contains required fields"
              className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: '#b87333', boxShadow: '0 0 5px rgba(184,115,51,0.55)' }}
            />
          )}
        </div>
        <span
          style={{
            display: 'inline-block',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s ease',
            color: isOpen ? '#b87333' : 'rgba(184,115,51,0.45)',
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </button>

      {/* CSS grid 0fr→1fr trick: smooth height animation, no JS measurement */}
      <div
        style={{
          display: 'grid',
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          transition: 'grid-template-rows 0.25s ease',
        }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="px-4 py-4 space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function WorkItemForm({ editItem, lockType, onSuccess, onCancel }: Props) {
  const [type, setType]     = useState<ItemType>(lockType ?? editItem?.item_type ?? 'demand');
  const [form, setForm]     = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Demand accordion state — panel 0 (Basic Info) open by default
  const [openPanels, setOpenPanels] = useState<Set<number>>(() => new Set([0]));
  const togglePanel = (i: number) => setOpenPanels(prev => {
    const s = new Set(prev);
    s.has(i) ? s.delete(i) : s.add(i);
    return s;
  });

  // Parent item options for link fields
  const [demandOpts,      setDemandOpts]      = useState<LinkOption[]>([]);
  const [enhancementOpts, setEnhancementOpts] = useState<LinkOption[]>([]);
  const [storyOpts,       setStoryOpts]       = useState<LinkOption[]>([]);

  useEffect(() => {
    if (lockType) setType(lockType);
  }, [lockType]);

  // Fetch parent options based on type
  useEffect(() => {
    if (type === 'enhancement' && !demandOpts.length) {
      fetch(`${API}/api/client/work-items?type=demand&status=active&limit=100`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setDemandOpts(d.items ?? []))
        .catch(() => {});
    }
    if (type === 'story' && !enhancementOpts.length) {
      fetch(`${API}/api/client/work-items?type=enhancement&status=active&limit=100`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setEnhancementOpts(d.items ?? []))
        .catch(() => {});
    }
    if (type === 'scrum_task' && !storyOpts.length) {
      fetch(`${API}/api/client/work-items?type=story&status=active&limit=100`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => setStoryOpts(d.items ?? []))
        .catch(() => {});
    }
  }, [type, demandOpts.length, enhancementOpts.length, storyOpts.length]);

  // Hydrate form from editItem
  useEffect(() => {
    if (!editItem) return;
    setType(editItem.item_type);
    setForm({
      title:                  editItem.title                  ?? '',
      priority:               editItem.priority               ?? 'medium',
      owner:                  editItem.owner                  ?? '',
      number:                 editItem.number                 ?? '',
      // demand core
      name:                   editItem.name                   ?? '',
      category:               editItem.category               ?? '',
      demand_type:            editItem.demand_type            ?? '',
      enhancement_number:     editItem.enhancement_number     ?? '',
      description:            editItem.description            ?? '',
      business_value:         editItem.business_value         ?? '',
      requested_by:           editItem.requested_by           ?? '',
      due_date:               editItem.due_date?.slice(0, 10) ?? '',
      estimated_effort:       editItem.estimated_effort       ?? '',
      demand_state:           editItem.demand_state           ?? 'Draft',
      collaborators:          editItem.collaborators          ?? '',
      // demand business analysis
      business_case:            editItem.business_case            ?? '',
      risk_of_performing:       editItem.risk_of_performing       ?? '',
      risk_of_not_performing:   editItem.risk_of_not_performing   ?? '',
      enablers:                 editItem.enablers                 ?? '',
      barriers:                 editItem.barriers                 ?? '',
      in_scope:                 editItem.in_scope                 ?? '',
      out_of_scope:             editItem.out_of_scope             ?? '',
      assumptions:              editItem.assumptions              ?? '',
      notes:                    editItem.notes                    ?? '',
      // enhancement
      current_state:          editItem.current_state          ?? '',
      desired_state:          editItem.desired_state          ?? '',
      impact:                 editItem.impact                 ?? '',
      affected_systems:       editItem.affected_systems       ?? '',
      business_justification: editItem.business_justification ?? '',
      enhancement_state:      editItem.enhancement_state      ?? 'Draft',
      demand_id:              editItem.demand_id              ?? '',
      // story
      as_a:                   editItem.as_a                   ?? '',
      i_want:                 editItem.i_want                 ?? '',
      so_that:                editItem.so_that                ?? '',
      acceptance_criteria:    editItem.acceptance_criteria    ?? '',
      story_points:           editItem.story_points?.toString() ?? '',
      sprint:                 editItem.sprint                 ?? '',
      story_state:            editItem.story_state            ?? 'Draft',
      story_type:             editItem.story_type             ?? 'Development',
      enhancement_id:         editItem.enhancement_id         ?? '',
      // scrum_task
      assigned_to:            editItem.assigned_to            ?? '',
      hours_worked:           editItem.hours_worked?.toString() ?? '',
      planned_hours:          editItem.planned_hours?.toString() ?? '',
      percent_complete:       editItem.percent_complete?.toString() ?? '0',
      start_date:             editItem.start_date?.slice(0, 10) ?? '',
      end_date:               editItem.end_date?.slice(0, 10) ?? '',
      story_id:               editItem.story_id               ?? '',
      task_state:             editItem.task_state             ?? 'Draft',
      task_type:              editItem.task_type              ?? 'Coding',
      // defect
      reproduction_steps:     editItem.reproduction_steps     ?? '',
      severity:               editItem.severity               ?? 'medium',
      environment:            editItem.environment            ?? '',
      root_cause:             editItem.root_cause             ?? '',
      resolution:             editItem.resolution             ?? '',
      version_found:          editItem.version_found          ?? '',
      defect_state:           editItem.defect_state           ?? 'Draft',
      reported_against:       editItem.reported_against       ?? '',
    });
  }, [editItem]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const inputCls = 'glass-input w-full rounded-lg px-3 py-2 text-sm';
  const areaCls  = `${inputCls} resize-none`;

  async function submit() {
    // Common validation
    if (type !== 'demand' && !form.title.trim()) { setError('Title is required'); return; }
    // Demand-specific validation
    if (type === 'demand') {
      if (!form.name.trim())                   { setError('Name is required'); return; }
      if (!form.category.trim())               { setError('Category is required'); return; }
      if (!form.demand_type.trim())            { setError('Type is required'); return; }
      if (!form.business_case.trim())          { setError('Business Case is required'); return; }
      if (!form.risk_of_performing.trim())     { setError('Risk of Performing is required'); return; }
      if (!form.risk_of_not_performing.trim()) { setError('Risk of Not Performing is required'); return; }
    }
    setSaving(true);
    setError('');
    try {
      // For demands, hub title mirrors the demand name
      const hubTitle = type === 'demand' ? form.name.trim() : form.title.trim();
      const payload: Record<string, unknown> = {
        item_type: type,
        title:    hubTitle,
        priority: form.priority,
        owner:    form.owner.trim() || null,
      };
      for (const [k, v] of Object.entries(form)) {
        if (k === 'title' || k === 'priority' || k === 'owner') continue;
        if (v === '' || v === null || v === undefined) continue;
        payload[k] = v;
      }

      const url    = editItem ? `${API}/api/client/work-items/${editItem.id}` : `${API}/api/client/work-items`;
      const method = editItem ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSuccess(editItem ? editItem.id : data.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const activeType = TYPES.find(t => t.key === type)!;

  return (
    <div className="glass-surface rounded-2xl p-6 space-y-5">

      {/* Type selector */}
      {!editItem && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Item type</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setType(t.key); setError(''); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                style={{
                  borderColor: type === t.key ? t.color : 'rgba(184,115,51,0.22)',
                  background:  type === t.key ? `${t.color}20` : 'transparent',
                  color:       type === t.key ? t.color : 'rgba(255,255,255,0.45)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {editItem && (
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded border"
            style={{ color: activeType.color, borderColor: `${activeType.color}50`, background: `${activeType.color}18` }}
          >
            {activeType.label}
          </span>
          <span className="text-xs text-muted-foreground">Editing — type locked</span>
        </div>
      )}

      <div className="copper-line" />

      {/* Common fields — Title hidden for demands (Name in demand section mirrors it) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {type !== 'demand' && (
          <div className="xl:col-span-2">
            <Field label="Title" required>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="Brief title…" className={inputCls} />
            </Field>
          </div>
        )}
        <Field label="Priority">
          <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
        <Field label="Owner">
          <input type="text" value={form.owner} onChange={e => set('owner', e.target.value)}
            placeholder="Name or team" className={inputCls} />
        </Field>
      </div>

      {/* Number field — universal, copper warning when empty */}
      <NumberField value={form.number} onChange={v => set('number', v)} cls={inputCls} />

      {/* ── Demand accordion ── */}
      {type === 'demand' && (
        <div className="space-y-2">

          {/* 0 — Basic Info (open by default) */}
          <AccordionPanel
            title="Basic Info"
            isOpen={openPanels.has(0)}
            onToggle={() => togglePanel(0)}
            hasRequired={!form.name.trim() || !form.category.trim() || !form.demand_type.trim()}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Name" required>
                <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Formal demand name…" className={inputCls} />
              </Field>
              <Field label="Category" required>
                <input type="text" value={form.category} onChange={e => set('category', e.target.value)}
                  placeholder="e.g. Process, Technology…" className={inputCls} />
              </Field>
              <Field label="Type" required>
                <input type="text" value={form.demand_type} onChange={e => set('demand_type', e.target.value)}
                  placeholder="e.g. New Feature, Improvement…" className={inputCls} />
              </Field>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="State">
                <select value={form.demand_state} onChange={e => set('demand_state', e.target.value)} className={inputCls}>
                  {DEMAND_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Enhancement Number">
                <div className="relative">
                  <input
                    type="text"
                    value={form.enhancement_number}
                    onChange={e => set('enhancement_number', e.target.value)}
                    placeholder="Link by enhancement number…"
                    className={inputCls}
                    style={!form.enhancement_number ? {
                      background: 'rgba(184,115,51,0.07)',
                      borderColor: 'rgba(184,115,51,0.35)',
                    } : undefined}
                  />
                  {!form.enhancement_number && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none"
                      style={{ color: 'rgba(184,115,51,0.65)' }}>
                      ⚠ unlinked
                    </span>
                  )}
                </div>
              </Field>
            </div>
            <Field label="Description">
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="What is being requested?" className={areaCls} />
            </Field>
          </AccordionPanel>

          {/* 1 — Business Case */}
          <AccordionPanel
            title="Business Case"
            isOpen={openPanels.has(1)}
            onToggle={() => togglePanel(1)}
            hasRequired={!form.business_case.trim()}
          >
            <Field label="Business Case" required>
              <textarea rows={5} value={form.business_case} onChange={e => set('business_case', e.target.value)}
                placeholder="Why is this demand important? What business outcome does it drive?" className={areaCls} />
            </Field>
          </AccordionPanel>

          {/* 2 — Risk Assessment */}
          <AccordionPanel
            title="Risk Assessment"
            isOpen={openPanels.has(2)}
            onToggle={() => togglePanel(2)}
            hasRequired={!form.risk_of_performing.trim() || !form.risk_of_not_performing.trim()}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Risk of Performing" required>
                <textarea rows={4} value={form.risk_of_performing} onChange={e => set('risk_of_performing', e.target.value)}
                  placeholder="Risks associated with executing this demand…" className={areaCls} />
              </Field>
              <Field label="Risk of Not Performing" required>
                <textarea rows={4} value={form.risk_of_not_performing} onChange={e => set('risk_of_not_performing', e.target.value)}
                  placeholder="Risks associated with NOT executing this demand…" className={areaCls} />
              </Field>
            </div>
          </AccordionPanel>

          {/* 3 — Scope */}
          <AccordionPanel
            title="Scope"
            isOpen={openPanels.has(3)}
            onToggle={() => togglePanel(3)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="In Scope">
                <textarea rows={4} value={form.in_scope} onChange={e => set('in_scope', e.target.value)}
                  placeholder="What is included in this demand?" className={areaCls} />
              </Field>
              <Field label="Out of Scope">
                <textarea rows={4} value={form.out_of_scope} onChange={e => set('out_of_scope', e.target.value)}
                  placeholder="What is explicitly excluded?" className={areaCls} />
              </Field>
            </div>
          </AccordionPanel>

          {/* 4 — Strategic */}
          <AccordionPanel
            title="Strategic"
            isOpen={openPanels.has(4)}
            onToggle={() => togglePanel(4)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Enablers">
                <textarea rows={3} value={form.enablers} onChange={e => set('enablers', e.target.value)}
                  placeholder="Factors that help execution…" className={areaCls} />
              </Field>
              <Field label="Barriers">
                <textarea rows={3} value={form.barriers} onChange={e => set('barriers', e.target.value)}
                  placeholder="Obstacles to execution…" className={areaCls} />
              </Field>
            </div>
            <Field label="Assumptions">
              <textarea rows={3} value={form.assumptions} onChange={e => set('assumptions', e.target.value)}
                placeholder="Assumptions made during demand definition…" className={areaCls} />
            </Field>
          </AccordionPanel>

          {/* 5 — Additional */}
          <AccordionPanel
            title="Additional"
            isOpen={openPanels.has(5)}
            onToggle={() => togglePanel(5)}
          >
            <Field label="Collaborators">
              <input type="text" value={form.collaborators} onChange={e => set('collaborators', e.target.value)}
                placeholder="Comma-separated names…" className={inputCls} />
            </Field>
            <Field label="Notes">
              <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any additional context or notes…" className={areaCls} />
            </Field>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Requested By">
                <input type="text" value={form.requested_by} onChange={e => set('requested_by', e.target.value)}
                  placeholder="Stakeholder name" className={inputCls} />
              </Field>
              <Field label="Due Date">
                <input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Estimated Effort">
                <input type="text" value={form.estimated_effort} onChange={e => set('estimated_effort', e.target.value)}
                  placeholder="e.g. 2 weeks, 8 hrs" className={inputCls} />
              </Field>
            </div>
            <Field label="Business Value">
              <textarea rows={2} value={form.business_value} onChange={e => set('business_value', e.target.value)}
                placeholder="ROI, customer impact…" className={areaCls} />
            </Field>
          </AccordionPanel>

        </div>
      )}

      {/* ── Enhancement fields ── */}
      {type === 'enhancement' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="State">
              <select value={form.enhancement_state} onChange={e => set('enhancement_state', e.target.value)} className={inputCls}>
                {ENHANCEMENT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <LinkField
              label="Parent Demand"
              options={demandOpts}
              value={form.demand_id}
              onChange={v => set('demand_id', v)}
              cls={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Current State">
              <textarea rows={3} value={form.current_state} onChange={e => set('current_state', e.target.value)}
                placeholder="How does it work today?" className={areaCls} />
            </Field>
            <Field label="Desired State">
              <textarea rows={3} value={form.desired_state} onChange={e => set('desired_state', e.target.value)}
                placeholder="How should it work?" className={areaCls} />
            </Field>
          </div>
          <Field label="Impact">
            <input type="text" value={form.impact} onChange={e => set('impact', e.target.value)}
              placeholder="Who / what is affected?" className={inputCls} />
          </Field>
          <Field label="Affected Systems">
            <input type="text" value={form.affected_systems} onChange={e => set('affected_systems', e.target.value)}
              placeholder="Apps, services, teams" className={inputCls} />
          </Field>
          <Field label="Business Justification">
            <textarea rows={2} value={form.business_justification} onChange={e => set('business_justification', e.target.value)}
              placeholder="ROI, compliance, UX…" className={areaCls} />
          </Field>
        </div>
      )}

      {/* ── Story fields ── */}
      {type === 'story' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="State">
              <select value={form.story_state} onChange={e => set('story_state', e.target.value)} className={inputCls}>
                {STORY_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.story_type} onChange={e => set('story_type', e.target.value)} className={inputCls}>
                {STORY_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <LinkField
              label="Parent Enhancement"
              options={enhancementOpts}
              value={form.enhancement_id}
              onChange={v => set('enhancement_id', v)}
              cls={inputCls}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="As a…">
              <input type="text" value={form.as_a} onChange={e => set('as_a', e.target.value)}
                placeholder="user role" className={inputCls} />
            </Field>
            <Field label="I want…">
              <input type="text" value={form.i_want} onChange={e => set('i_want', e.target.value)}
                placeholder="feature / action" className={inputCls} />
            </Field>
            <Field label="So that…">
              <input type="text" value={form.so_that} onChange={e => set('so_that', e.target.value)}
                placeholder="benefit / outcome" className={inputCls} />
            </Field>
          </div>
          <Field label="Acceptance Criteria">
            <RichTextArea
              value={form.acceptance_criteria}
              onChange={v => set('acceptance_criteria', v)}
              rows={6}
              placeholder={'Given / When / Then…\n\nSupports HTML formatting in preview mode.'}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Story Points">
              <input type="number" min={0} max={999} value={form.story_points} onChange={e => set('story_points', e.target.value)}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="Sprint">
              <input type="text" value={form.sprint} onChange={e => set('sprint', e.target.value)}
                placeholder="Sprint 12" className={inputCls} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Scrum Task fields ── */}
      {type === 'scrum_task' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="State">
              <select value={form.task_state} onChange={e => set('task_state', e.target.value)} className={inputCls}>
                {TASK_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={form.task_type} onChange={e => set('task_type', e.target.value)} className={inputCls}>
                {TASK_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <LinkField
              label="Parent Story"
              options={storyOpts}
              value={form.story_id}
              onChange={v => set('story_id', v)}
              cls={inputCls}
            />
          </div>
          <Field label="Description">
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Task details…" className={areaCls} />
          </Field>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="Assigned To">
              <input type="text" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                placeholder="Developer" className={inputCls} />
            </Field>
            <Field label="Planned Hours">
              <input type="number" min={0} step={0.5} value={form.planned_hours} onChange={e => set('planned_hours', e.target.value)}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="Hours Worked">
              <input type="number" min={0} step={0.5} value={form.hours_worked} onChange={e => set('hours_worked', e.target.value)}
                placeholder="0" className={inputCls} />
            </Field>
            <Field label="% Complete">
              <input type="number" min={0} max={100} value={form.percent_complete} onChange={e => set('percent_complete', e.target.value)}
                className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="End Date">
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>
      )}

      {/* ── Defect fields ── */}
      {type === 'defect' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="State">
              <select value={form.defect_state} onChange={e => set('defect_state', e.target.value)} className={inputCls}>
                {DEFECT_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Severity">
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Environment">
              <select value={form.environment} onChange={e => set('environment', e.target.value)} className={inputCls}>
                <option value="">— Select —</option>
                {DEFECT_ENVS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="Version Found">
              <input type="text" value={form.version_found} onChange={e => set('version_found', e.target.value)}
                placeholder="v2.3.1" className={inputCls} />
            </Field>
          </div>
          <Field label="Description">
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="What is broken?" className={areaCls} />
          </Field>
          <Field label="Reproduction Steps">
            <textarea rows={4} value={form.reproduction_steps} onChange={e => set('reproduction_steps', e.target.value)}
              placeholder={'1. Go to…\n2. Click…\n3. Observe…'} className={areaCls} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Assigned To">
              <input type="text" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}
                placeholder="Developer" className={inputCls} />
            </Field>
            <Field label="Reported Against">
              <input type="text" value={form.reported_against} onChange={e => set('reported_against', e.target.value)}
                placeholder="Feature / component name" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Root Cause">
              <textarea rows={2} value={form.root_cause} onChange={e => set('root_cause', e.target.value)}
                placeholder="Optional" className={areaCls} />
            </Field>
            <Field label="Resolution">
              <textarea rows={2} value={form.resolution} onChange={e => set('resolution', e.target.value)}
                placeholder="Optional" className={areaCls} />
            </Field>
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="glass-btn-danger px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
          style={{ background: 'rgba(184,115,51,0.22)', border: '1px solid rgba(184,115,51,0.5)', color: '#d4a373' }}
        >
          {saving ? 'Saving…' : editItem ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="glass-btn px-4 py-2 rounded-xl text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
