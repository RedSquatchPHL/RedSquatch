'use client';

import { useEffect, useMemo, useState } from 'react';
import { Users, HeartHandshake, MapPin, ClipboardList, GitBranch, Lightbulb, UserPlus } from 'lucide-react';
import { API } from '@/lib/api';

type PersonType = 'family' | 'associate' | 'neighbor' | 'other';
type StatusClass = 'searched' | 'pending' | 'breakthrough';

interface Person {
  id: number;
  name: string;
  type: PersonType;
  details: string[];
  status_label: string;
  status_class: StatusClass;
}

interface RecordItem {
  id: number;
  item_key: string;
  group_title: string;
  label: string;
  checked: boolean;
}

const TYPE_ACCENT: Record<PersonType, string> = {
  family: '#b87333',
  associate: '#2a95a3',
  neighbor: '#3f8a86',
  other: 'rgba(212,163,115,0.4)',
};

const STATUS_STYLE: Record<StatusClass, { bg: string; color: string }> = {
  searched: { bg: 'rgba(76,175,80,0.18)', color: '#4caf50' },
  pending: { bg: 'rgba(184,115,51,0.18)', color: '#d4a373' },
  breakthrough: { bg: 'rgba(42,149,163,0.18)', color: '#2a95a3' },
};

const GROUP_ORDER = ['Mexican Records (Jalisco)', 'US Census & Immigration Records', 'California County Records'];
const GROUP_ACCENT: Record<string, string> = {
  'Mexican Records (Jalisco)': '#b87333',
  'US Census & Immigration Records': '#2a95a3',
  'California County Records': '#3f8a86',
};

const INSIGHTS: { title: string; items: { label: string; text: string }[] }[] = [
  {
    title: '1. Immediate Priority: Resolve Pedro’s Birth Year',
    items: [
      { label: 'Action', text: 'Search 1940 US Census for Pedro in Riverside County / Northern California area. If listed as age ~8, born 1932. If listed as age ~54, born 1886.' },
      { label: 'Why this matters', text: 'Birth year anchors all downstream Mexican archive searches & determines which Guadalajara/Jalisco records to target.' },
    ],
  },
  {
    title: '2. FAN Strategy: Use Arcadio & María as Bridges',
    items: [
      { label: 'Key insight', text: 'Arcadio & María are well-documented (birth certs in Ahualulco, 1924 LA marriage record). Every neighbor, witness, or associate who appears with them in these records is a potential thread to pull for Pedro.' },
      { label: 'Next step', text: 'Re-examine 1924 LA marriage certificate for witnesses—those names could lead to Riverside County settlements or Mexican origins.' },
    ],
  },
  {
    title: '3. Guadalajara Question: Is Pedro’s Father From There?',
    items: [
      { label: 'Current knowledge', text: 'You mentioned Benito Gomez (not Pedro) born in Guadalajara. Clarify: Are Benito & Pedro the same person, or different generations?' },
      { label: 'If different', text: 'Search Arcadio Preciado Santana’s father (Jose) & mother (Cecilia) in Jalisco records—they may be your links to Pedro’s paternal line.' },
    ],
  },
  {
    title: '4. Use Irma Precia as a Living Witness',
    items: [
      { label: 'Gold mine', text: 'Irma is Pedro’s half-aunt & still living. She knows family stories, maiden names, nicknames, & may have old documents or photos.' },
      { label: 'Interview questions to ask', text: 'Pedro’s siblings’ names? Any family Bible records? Did relatives keep Guadalajara/Jalisco connections? Who were the first family members to settle in Riverside County?' },
    ],
  },
  {
    title: '5. Geographic Clustering: Search Riverside County + Sacramento',
    items: [
      { label: 'Strategy', text: 'Pull 1930 & 1940 Census pages for Riverside County & Sacramento area, searching for surname clusters (Ortiz, Preciado, common Jalisco surnames). Mexican enumerators often lived in clusters.' },
      { label: 'Tools', text: 'FamilySearch Census indexes, Ancestry, Fold3 for naturalization records.' },
    ],
  },
  {
    title: '6. Mexican Municipal Archives: Ahualulco Next Target',
    items: [
      { label: 'Known records there', text: 'Arcadio (1902), María (1906), María’s death (1992) all registered in Ahualulco de Mercado. Pedro likely has a birth record too.' },
      { label: 'Access', text: 'Contact Ahualulco municipal office or search FamilySearch’s Jalisco collections. Parish records may have cross-references.' },
    ],
  },
];

type Tab = 'circle' | 'records' | 'tree' | 'insights' | 'add';

function PersonCard({ person }: { person: Person }) {
  const accent = TYPE_ACCENT[person.type];
  const status = STATUS_STYLE[person.status_class];
  return (
    <div
      className="rounded-md p-3 mb-2 transition-colors"
      style={{ background: 'rgba(20,18,16,0.6)', borderLeft: `3px solid ${accent}` }}
    >
      <div className="text-sm font-semibold mb-1" style={{ color: '#d4a373' }}>{person.name}</div>
      <div className="text-xs mb-2 leading-relaxed" style={{ color: 'rgba(212,163,115,0.7)' }}>
        {person.details.map((line, i) => <div key={i}>{line}</div>)}
      </div>
      <span
        className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: status.bg, color: status.color }}
      >
        {person.status_label}
      </span>
    </div>
  );
}

export default function PedroFanTracker() {
  const [tab, setTab] = useState<Tab>('circle');
  const [people, setPeople] = useState<Person[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState<PersonType | ''>('');
  const [newBirth, setNewBirth] = useState('');
  const [newPlace, setNewPlace] = useState('');
  const [newUSLocation, setNewUSLocation] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newStatus, setNewStatus] = useState<StatusClass>('pending');

  const NEW_STATUS_LABEL: Record<StatusClass, string> = {
    pending: 'PENDING SEARCH',
    searched: 'ALREADY SEARCHED',
    breakthrough: 'BREAKTHROUGH POTENTIAL',
  };

  useEffect(() => {
    (async () => {
      try {
        const [peopleRes, recordsRes] = await Promise.all([
          fetch(`${API}/api/client/fan-tracker/people`, { credentials: 'include' }),
          fetch(`${API}/api/client/fan-tracker/records`, { credentials: 'include' }),
        ]);
        if (!peopleRes.ok || !recordsRes.ok) throw new Error('fetch failed');
        const peopleData = await peopleRes.json();
        const recordsData = await recordsRes.json();
        setPeople(peopleData.people ?? []);
        setRecords(recordsData.records ?? []);
      } catch {
        setError('Could not load the FAN tracker — check your connection.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const family = useMemo(() => people.filter(p => p.type === 'family'), [people]);
  const associates = useMemo(() => people.filter(p => p.type === 'associate' || p.type === 'other'), [people]);
  const neighbors = useMemo(() => people.filter(p => p.type === 'neighbor'), [people]);

  const recordsByGroup = useMemo(() => {
    const map: Record<string, RecordItem[]> = {};
    for (const r of records) (map[r.group_title] ??= []).push(r);
    return map;
  }, [records]);

  async function toggleRecord(record: RecordItem) {
    const nextChecked = !record.checked;
    setRecords(prev => prev.map(r => (r.id === record.id ? { ...r, checked: nextChecked } : r)));
    try {
      await fetch(`${API}/api/client/fan-tracker/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ checked: nextChecked }),
      });
    } catch {
      setError('Update failed to save — check your connection.');
    }
  }

  async function addPerson() {
    const name = newName.trim();
    if (!name || !newRelation) {
      setConfirmMsg('Please enter at least a name and relationship.');
      setTimeout(() => setConfirmMsg(null), 3000);
      return;
    }

    const details: string[] = [];
    if (newBirth.trim()) details.push(`Born: ${newBirth.trim()}`);
    if (newPlace.trim()) details.push(`Birthplace: ${newPlace.trim()}`);
    if (newUSLocation.trim()) details.push(`US Location: ${newUSLocation.trim()}`);
    if (newNotes.trim()) details.push(`Notes: ${newNotes.trim()}`);

    try {
      const res = await fetch(`${API}/api/client/fan-tracker/people`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          type: newRelation,
          details,
          status_label: NEW_STATUS_LABEL[newStatus],
          status_class: newStatus,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      const created = await res.json();
      setPeople(prev => [...prev, created]);

      setNewName('');
      setNewRelation('');
      setNewBirth('');
      setNewPlace('');
      setNewUSLocation('');
      setNewNotes('');
      setNewStatus('pending');

      setConfirmMsg(`Added "${name}" to your FAN circle!`);
    } catch {
      setConfirmMsg('Failed to save — check your connection.');
    } finally {
      setTimeout(() => setConfirmMsg(null), 3000);
    }
  }

  const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: 'circle', label: 'FAN Circle', icon: Users },
    { key: 'records', label: 'Record Checklist', icon: ClipboardList },
    { key: 'tree', label: 'Family Tree', icon: GitBranch },
    { key: 'insights', label: 'Research Insights', icon: Lightbulb },
    { key: 'add', label: 'Add Person', icon: UserPlus },
  ];

  const inputStyle: React.CSSProperties = {
    borderColor: 'rgba(184,115,51,0.3)',
    color: '#d4a373',
    background: 'transparent',
  };

  if (loading) {
    return <div className="py-12 text-center" style={{ color: '#d4a373' }}>Loading…</div>;
  }

  return (
    <div style={{ color: '#d4a373' }}>
      <div className="mb-1">
        <h2 className="text-xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Pedro Ortiz Preciado — FAN Tracker
        </h2>
        <p className="text-xs mt-1" style={{ color: 'rgba(212,163,115,0.6)' }}>
          Friends, Associates & Neighbors Research System | Ahualulco, Jalisco → California
        </p>
        {error && <p className="text-xs mt-1 text-red-400">{error}</p>}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 my-4">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors"
            style={{
              background: tab === key ? 'rgba(184,115,51,0.28)' : 'transparent',
              borderColor: '#b87333',
              color: tab === key ? '#fff' : '#d4a373',
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* FAN CIRCLE */}
      {tab === 'circle' && (
        <div>
          <div className="flex items-center gap-2 text-sm font-bold mb-2 pb-2" style={{ color: '#d4a373', borderBottom: '2px solid rgba(184,115,51,0.2)' }}>
            <Users size={16} /> Direct Family (Core Research Targets)
          </div>
          {family.map(p => <PersonCard key={p.id} person={p} />)}

          <div className="flex items-center gap-2 text-sm font-bold mt-6 mb-2 pb-2" style={{ color: '#d4a373', borderBottom: '2px solid rgba(184,115,51,0.2)' }}>
            <HeartHandshake size={16} /> Associates & Extended Family
          </div>
          {associates.map(p => <PersonCard key={p.id} person={p} />)}

          <div className="flex items-center gap-2 text-sm font-bold mt-6 mb-2 pb-2" style={{ color: '#d4a373', borderBottom: '2px solid rgba(184,115,51,0.2)' }}>
            <MapPin size={16} /> Geographic Anchors
          </div>
          {neighbors.map(p => <PersonCard key={p.id} person={p} />)}
        </div>
      )}

      {/* RECORD CHECKLIST */}
      {tab === 'records' && (
        <div>
          {GROUP_ORDER.filter(g => recordsByGroup[g]?.length).map(group => (
            <div key={group} className="mb-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: GROUP_ACCENT[group] }}>{group}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recordsByGroup[group].map(record => (
                  <label
                    key={record.id}
                    onClick={() => toggleRecord(record)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-xs cursor-pointer"
                    style={{ background: record.checked ? 'rgba(76,175,80,0.12)' : 'rgba(20,18,16,0.6)' }}
                  >
                    <input type="checkbox" checked={record.checked} readOnly className="flex-shrink-0" />
                    <span style={{ color: record.checked ? '#4caf50' : 'rgba(212,163,115,0.85)' }}>{record.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAMILY TREE */}
      {tab === 'tree' && (
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#d4a373' }}>Family Connections (What We Know)</h3>
          <div className="rounded-md p-4 overflow-x-auto" style={{ background: 'rgba(20,18,16,0.6)' }}>
            {[
              [{ name: 'Jose', dates: '~1862' }, { name: 'Cecilia', dates: '~1870' }],
              null,
              [{ name: 'Arcadio Preciado Santana', dates: '1902–?', focus: true }],
              'm. 1924',
              [{ name: 'María Salome Ortiz Santana', dates: '1906–1992' }],
              null,
              [
                { name: 'PEDRO ORTIZ PRECIADO', dates: '~1932 (?)–?', focus: true },
                { name: '3 Siblings', dates: 'Details TBD' },
              ],
            ].map((row, i) => {
              if (row === null) return <div key={i} className="text-center text-xs my-3" style={{ color: 'rgba(212,163,115,0.4)' }}>↓ Children ↓</div>;
              if (typeof row === 'string') return <div key={i} className="text-center text-xs my-3" style={{ color: 'rgba(212,163,115,0.4)' }}>{row} ↓</div>;
              return (
                <div key={i} className="flex flex-wrap gap-3 justify-center my-2">
                  {row.map(card => (
                    <div
                      key={card.name}
                      className="rounded-md px-4 py-2 text-center min-w-[160px]"
                      style={{
                        background: card.focus ? 'rgba(184,115,51,0.15)' : 'rgba(0,0,0,0.2)',
                        border: `2px solid ${card.focus ? '#2a95a3' : '#b87333'}`,
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: '#d4a373' }}>{card.name}</div>
                      <div className="text-xs mt-1" style={{ color: 'rgba(212,163,115,0.6)' }}>{card.dates}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="rounded-md p-4 mt-4" style={{ background: 'rgba(20,18,16,0.6)', borderLeft: '3px solid #b87333' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#d4a373' }}>Key Data Gaps</h3>
            {[
              ['Pedro’s exact birth year', '1932 vs 1886 discrepancy must be resolved via 1940 Census age check'],
              ['Pedro’s parents', 'Is he Arcadio’s biological son, or son of María from another relationship?'],
              ['Siblings', 'Names, birth dates, and current locations unknown'],
              ['Arcadio’s death', 'Date & location unconfirmed'],
            ].map(([label, text]) => (
              <div key={label} className="text-xs rounded-md p-2 mb-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <strong style={{ color: '#d4a373' }}>{label}:</strong> <span style={{ color: 'rgba(212,163,115,0.75)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INSIGHTS */}
      {tab === 'insights' && (
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#d4a373' }}>Research Strategy & Breakthrough Opportunities</h3>
          {INSIGHTS.map(section => (
            <div key={section.title} className="rounded-md p-4 mb-3" style={{ background: 'rgba(20,18,16,0.6)', borderLeft: '3px solid #b87333' }}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: '#d4a373' }}>{section.title}</h4>
              {section.items.map(item => (
                <div key={item.label} className="text-xs rounded-md p-2 mb-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <strong style={{ color: '#d4a373' }}>{item.label}:</strong> <span style={{ color: 'rgba(212,163,115,0.75)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ADD PERSON */}
      {tab === 'add' && (
        <div>
          <h3 className="text-sm font-bold mb-3" style={{ color: '#d4a373' }}>Add a New Person to Your FAN Circle</h3>
          <div className="rounded-md p-4 space-y-3" style={{ background: 'rgba(20,18,16,0.6)' }}>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Full Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Juan García Martínez" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Relationship to Pedro</label>
                <select value={newRelation} onChange={e => setNewRelation(e.target.value as PersonType | '')} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                  <option value="" style={{ color: '#000' }}>-- Select --</option>
                  <option value="family" style={{ color: '#000' }}>Family Member</option>
                  <option value="associate" style={{ color: '#000' }}>Associate/Witness</option>
                  <option value="neighbor" style={{ color: '#000' }}>Neighbor</option>
                  <option value="other" style={{ color: '#000' }}>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Birth Year</label>
                <input value={newBirth} onChange={e => setNewBirth(e.target.value)} placeholder="e.g., 1900" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Birthplace</label>
                <input value={newPlace} onChange={e => setNewPlace(e.target.value)} placeholder="e.g., Ahualulco, Jalisco" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Location in US (if applicable)</label>
                <input value={newUSLocation} onChange={e => setNewUSLocation(e.target.value)} placeholder="e.g., Riverside, CA" className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Notes & Details</label>
              <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={3} placeholder="Where you found them, what records mention them, next steps..." className="w-full border px-2 py-1.5 text-sm rounded resize-vertical" style={inputStyle} />
            </div>

            <div>
              <label className="block text-xs mb-1" style={{ color: 'rgba(212,163,115,0.7)' }}>Search Status</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value as StatusClass)} className="w-full border px-2 py-1.5 text-sm rounded" style={inputStyle}>
                <option value="pending" style={{ color: '#000' }}>Pending Search</option>
                <option value="searched" style={{ color: '#000' }}>Already Searched</option>
                <option value="breakthrough" style={{ color: '#000' }}>Breakthrough Potential</option>
              </select>
            </div>

            <button
              type="button"
              onClick={addPerson}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold"
              style={{ background: '#b87333', color: '#0f0f0f' }}
            >
              <UserPlus size={14} /> Add to FAN Circle
            </button>
          </div>

          {confirmMsg && (
            <div className="mt-3 text-xs rounded-md p-2" style={{ background: 'rgba(76,175,80,0.15)', color: '#4caf50' }}>
              {confirmMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
