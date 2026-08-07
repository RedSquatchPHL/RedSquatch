'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Trash2, Edit2, Calendar, DollarSign, RefreshCw, Eye, EyeOff,
  Upload, Lightbulb, CreditCard, X,
} from 'lucide-react';
import { API } from '@/lib/api';

interface Balance {
  id: number;
  name: string;
  balance: string;
  last_reconciled_at: string | null;
  notes: string | null;
}

interface RecurringBill {
  id: number;
  name: string;
  vendor: string | null;
  amount: string;
  due_day: number;
  category: 'utilities' | 'subscriptions' | 'insurance' | 'other';
  frequency: 'monthly' | 'quarterly' | 'yearly';
  is_active: boolean;
  is_credit_card: boolean;
  statement_close_day: number | null;
  notes: string | null;
}

interface BnplPlan {
  id: number;
  vendor: string;
  total_amount: string;
  remaining_amount: string;
  next_payment_amount: string | null;
  next_payment_date: string | null;
  installments_total: number | null;
  installments_remaining: number | null;
}

interface StatementRow {
  date: string;
  description: string;
  amount: number;
}

const CATEGORIES = { utilities: 'Utilities', subscriptions: 'Subscriptions', insurance: 'Insurance', other: 'Other' };
const RECONCILE_DAYS = 90;

const money = (v: string | number | null | undefined) => `$${Number(v || 0).toFixed(2)}`;

const daysSince = (dateStr: string | null) => {
  if (!dateStr) return Infinity;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
};

const creditTipWindow = (closeDay: number) => ({
  start: Math.max(1, closeDay - 5),
  end: Math.max(1, closeDay - 1),
});

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}/api/client/bills${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  return res.json();
}

// Minimal CSV parser: handles comma-separated rows with optional double-quoted fields.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    const fields: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        fields.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur);
    rows.push(fields.map((f) => f.trim()));
  }
  return rows;
}

function extractStatementRows(csvText: string): StatementRow[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.toLowerCase());

  const dateIdx = header.findIndex((h) => h.includes('date'));
  const descIdx = header.findIndex((h) => h.includes('desc') || h.includes('name') || h.includes('payee') || h.includes('merchant'));
  const amountIdx = header.findIndex((h) => h.includes('amount') || h.includes('gross') || h.includes('debit') || h.includes('total'));

  if (amountIdx === -1) return [];

  return rows
    .slice(1)
    .map((r) => {
      const rawAmount = (r[amountIdx] || '0').replace(/[^0-9.-]/g, '');
      return {
        date: dateIdx !== -1 ? r[dateIdx] || '' : '',
        description: descIdx !== -1 ? r[descIdx] || 'Unknown' : 'Unknown',
        amount: parseFloat(rawAmount) || 0,
      };
    })
    .filter((r) => r.description && !Number.isNaN(r.amount))
    .slice(0, 50);
}

export default function BillPlanner() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [bnplPlans, setBnplPlans] = useState<BnplPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [bnplVisible, setBnplVisible] = useState(false);

  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ name: '', balance: '' });

  const [showBillForm, setShowBillForm] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [billForm, setBillForm] = useState<Partial<RecurringBill>>({ category: 'utilities', frequency: 'monthly', is_credit_card: false });

  const [showBnplForm, setShowBnplForm] = useState(false);
  const [bnplForm, setBnplForm] = useState<Partial<BnplPlan>>({});

  const [statementRows, setStatementRows] = useState<StatementRow[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    const [b, r, p] = await Promise.all([api('/balances'), api('/recurring'), api('/bnpl')]);
    setBalances(b?.balances || []);
    setBills(r?.bills || []);
    setBnplPlans(p?.plans || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ─── Balances ───────────────────────────────────────────────────────────

  const addBalance = async () => {
    if (!balanceForm.name.trim()) return;
    await api('/balances', { method: 'POST', body: JSON.stringify({ name: balanceForm.name, balance: parseFloat(balanceForm.balance) || 0 }) });
    setBalanceForm({ name: '', balance: '' });
    setShowBalanceForm(false);
    loadAll();
  };

  const reconcileBalance = async (b: Balance) => {
    const input = window.prompt(`Confirm current balance for ${b.name}:`, b.balance);
    if (input === null) return;
    await api(`/balances/${b.id}/reconcile`, { method: 'POST', body: JSON.stringify({ balance: parseFloat(input) || 0 }) });
    loadAll();
  };

  const deleteBalance = async (id: number) => {
    await api(`/balances/${id}`, { method: 'DELETE' });
    loadAll();
  };

  // ─── Recurring bills ────────────────────────────────────────────────────

  const resetBillForm = () => {
    setBillForm({ category: 'utilities', frequency: 'monthly', is_credit_card: false });
    setEditingBill(null);
    setShowBillForm(false);
  };

  const saveBill = async () => {
    if (!billForm.name || !billForm.due_day) return;
    const payload = {
      name: billForm.name,
      vendor: billForm.vendor || null,
      amount: billForm.amount || 0,
      due_day: billForm.due_day,
      category: billForm.category,
      frequency: billForm.frequency,
      is_credit_card: billForm.is_credit_card || false,
      statement_close_day: billForm.is_credit_card ? billForm.statement_close_day || null : null,
      notes: billForm.notes || null,
    };
    if (editingBill) {
      await api(`/recurring/${editingBill.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await api('/recurring', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetBillForm();
    loadAll();
  };

  const editBill = (b: RecurringBill) => {
    setEditingBill(b);
    setBillForm(b);
    setShowBillForm(true);
  };

  const deleteBill = async (id: number) => {
    await api(`/recurring/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const markPaid = async (b: RecurringBill) => {
    await api(`/recurring/${b.id}/pay`, { method: 'POST', body: JSON.stringify({ amount: b.amount }) });
    loadAll();
  };

  const totalMonthly = useMemo(
    () =>
      bills
        .filter((b) => b.is_active)
        .reduce((sum, b) => {
          const amt = Number(b.amount);
          if (b.frequency === 'monthly') return sum + amt;
          if (b.frequency === 'quarterly') return sum + amt / 3;
          if (b.frequency === 'yearly') return sum + amt / 12;
          return sum;
        }, 0),
    [bills]
  );

  // ─── BNPL ───────────────────────────────────────────────────────────────

  const addBnpl = async () => {
    if (!bnplForm.vendor) return;
    await api('/bnpl', {
      method: 'POST',
      body: JSON.stringify({
        vendor: bnplForm.vendor,
        total_amount: bnplForm.total_amount || 0,
        remaining_amount: bnplForm.remaining_amount ?? bnplForm.total_amount ?? 0,
        next_payment_amount: bnplForm.next_payment_amount || null,
        next_payment_date: bnplForm.next_payment_date || null,
        installments_total: bnplForm.installments_total || null,
        installments_remaining: bnplForm.installments_remaining || null,
      }),
    });
    setBnplForm({});
    setShowBnplForm(false);
    loadAll();
  };

  const deleteBnpl = async (id: number) => {
    await api(`/bnpl/${id}`, { method: 'DELETE' });
    loadAll();
  };

  const mask = (text: string) => (bnplVisible ? text : '••••••');

  // ─── Statement upload ───────────────────────────────────────────────────

  const handleFile = (file: File) => {
    setUploadError(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadError('Only CSV files are supported right now — export your PayPal or bank statement as CSV and try again. PDF/image statement parsing isn’t implemented yet.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const rows = extractStatementRows(String(reader.result || ''));
      if (rows.length === 0) {
        setUploadError('Couldn’t find recognizable date/description/amount columns in this file.');
        setStatementRows(null);
      } else {
        setStatementRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const importRowAsBalance = async (row: StatementRow) => {
    await api('/balances', { method: 'POST', body: JSON.stringify({ name: row.description, balance: row.amount }) });
    loadAll();
  };

  const importRowAsBill = async (row: StatementRow) => {
    const dueDay = row.date ? new Date(row.date).getDate() || 1 : 1;
    await api('/recurring', {
      method: 'POST',
      body: JSON.stringify({ name: row.description, amount: Math.abs(row.amount), due_day: dueDay, category: 'other', frequency: 'monthly' }),
    });
    loadAll();
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Bill Planner
        </h1>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(184,115,51,0.25)' }}>
          <DollarSign size={16} style={{ color: '#d4a373' }} />
          <span className="text-sm font-semibold" style={{ color: '#d4a373' }}>{money(totalMonthly)}/month</span>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-sm py-8" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* ── Balances ── */}
          <div className="glass-surface rounded-xl p-4" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#d4a373' }}>Account Balances</h3>
              <button onClick={() => setShowBalanceForm((s) => !s)}><Plus size={16} style={{ color: '#d4a373' }} /></button>
            </div>

            {showBalanceForm && (
              <div className="mb-3 space-y-2">
                <input
                  type="text"
                  placeholder="Account name"
                  value={balanceForm.name}
                  onChange={(e) => setBalanceForm({ ...balanceForm, name: e.target.value })}
                  className="glass-input w-full px-2 py-1.5 rounded text-xs"
                />
                <input
                  type="number"
                  placeholder="Current balance"
                  value={balanceForm.balance}
                  onChange={(e) => setBalanceForm({ ...balanceForm, balance: e.target.value })}
                  className="glass-input w-full px-2 py-1.5 rounded text-xs"
                />
                <button onClick={addBalance} className="glass-btn w-full py-1.5 rounded text-xs font-semibold">Add</button>
              </div>
            )}

            <div className="space-y-2">
              {balances.length === 0 && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No balances logged yet.</p>}
              {balances.map((b) => {
                const due = daysSince(b.last_reconciled_at) >= RECONCILE_DAYS;
                return (
                  <div key={b.id} className="rounded-lg p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{b.name}</span>
                      <span className="font-semibold" style={{ color: '#d4a373' }}>{money(b.balance)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span style={{ color: due ? '#e07856' : 'rgba(255,255,255,0.35)' }}>
                        {b.last_reconciled_at ? `Reconciled ${daysSince(b.last_reconciled_at)}d ago` : 'Never reconciled'}
                        {due && ' — reconcile due'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => reconcileBalance(b)} title="Reconcile"><RefreshCw size={12} style={{ color: '#d4a373' }} /></button>
                        <button onClick={() => deleteBalance(b.id)} title="Delete"><Trash2 size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Reconcile balances every {RECONCILE_DAYS} days to keep these accurate.
            </p>
          </div>

          {/* ── Recurring bills ── */}
          <div className="glass-surface rounded-xl p-4" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#d4a373' }}>Recurring Bills</h3>
              <button onClick={() => { resetBillForm(); setShowBillForm((s) => !s); }}><Plus size={16} style={{ color: '#d4a373' }} /></button>
            </div>

            <div className="mb-3 flex items-start gap-1.5 text-[10px] rounded p-2" style={{ background: 'rgba(184,115,51,0.08)', color: 'rgba(255,255,255,0.55)' }}>
              <Lightbulb size={12} className="flex-shrink-0 mt-0.5" style={{ color: '#d4a373' }} />
              <span>Paying down a credit card a few days before its statement closes (not the due date) lowers what gets reported as your balance — that can help your credit score.</span>
            </div>

            {showBillForm && (
              <div className="mb-3 space-y-2">
                <input type="text" placeholder="Bill name" value={billForm.name || ''} onChange={(e) => setBillForm({ ...billForm, name: e.target.value })} className="glass-input w-full px-2 py-1.5 rounded text-xs" />
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="number" placeholder="Amount" value={billForm.amount || ''} onChange={(e) => setBillForm({ ...billForm, amount: parseFloat(e.target.value) as any })} className="glass-input px-2 py-1.5 rounded text-xs" />
                  <input type="number" placeholder="Due day (1-31)" min={1} max={31} value={billForm.due_day || ''} onChange={(e) => setBillForm({ ...billForm, due_day: parseInt(e.target.value) as any })} className="glass-input px-2 py-1.5 rounded text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select value={billForm.category} onChange={(e) => setBillForm({ ...billForm, category: e.target.value as any })} className="glass-input px-2 py-1.5 rounded text-xs">
                    {Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                  <select value={billForm.frequency} onChange={(e) => setBillForm({ ...billForm, frequency: e.target.value as any })} className="glass-input px-2 py-1.5 rounded text-xs">
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <label className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <input type="checkbox" checked={!!billForm.is_credit_card} onChange={(e) => setBillForm({ ...billForm, is_credit_card: e.target.checked })} />
                  <CreditCard size={12} /> This is a credit card
                </label>
                {billForm.is_credit_card && (
                  <input
                    type="number"
                    placeholder="Statement closing day (1-31)"
                    min={1}
                    max={31}
                    value={billForm.statement_close_day || ''}
                    onChange={(e) => setBillForm({ ...billForm, statement_close_day: parseInt(e.target.value) as any })}
                    className="glass-input w-full px-2 py-1.5 rounded text-xs"
                  />
                )}
                <div className="flex gap-1.5">
                  <button onClick={saveBill} className="glass-btn flex-1 py-1.5 rounded text-xs font-semibold">{editingBill ? 'Update' : 'Save'}</button>
                  <button onClick={resetBillForm} className="px-3 py-1.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}>Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {bills.filter((b) => b.is_active).length === 0 && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No bills yet.</p>}
              {bills.filter((b) => b.is_active).map((b) => {
                const tip = b.is_credit_card && b.statement_close_day ? creditTipWindow(b.statement_close_day) : null;
                return (
                  <div key={b.id} className="rounded-lg p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{b.name}</span>
                      <span className="font-semibold" style={{ color: '#d4a373' }}>{money(b.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        <Calendar size={11} /> Due day {b.due_day} • {b.frequency}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => markPaid(b)} title="Mark paid" style={{ color: '#4ade80' }}>✓</button>
                        <button onClick={() => editBill(b)} title="Edit"><Edit2 size={12} style={{ color: '#d4a373' }} /></button>
                        <button onClick={() => deleteBill(b.id)} title="Delete"><Trash2 size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
                      </div>
                    </div>
                    {tip && (
                      <div className="mt-1.5 text-[10px]" style={{ color: '#d4a373' }}>
                        💡 Extra payment window: day {tip.start}–{tip.end} (closes day {b.statement_close_day})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── BNPL ── */}
          <div className="glass-surface rounded-xl p-4" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: '#d4a373' }}>Buy Now, Pay Later</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setBnplVisible((v) => !v)} title={bnplVisible ? 'Hide amounts' : 'Show amounts'}>
                  {bnplVisible ? <EyeOff size={14} style={{ color: '#d4a373' }} /> : <Eye size={14} style={{ color: '#d4a373' }} />}
                </button>
                <button onClick={() => setShowBnplForm((s) => !s)}><Plus size={16} style={{ color: '#d4a373' }} /></button>
              </div>
            </div>

            {showBnplForm && (
              <div className="mb-3 space-y-2">
                <input type="text" placeholder="Vendor / item" value={bnplForm.vendor || ''} onChange={(e) => setBnplForm({ ...bnplForm, vendor: e.target.value })} className="glass-input w-full px-2 py-1.5 rounded text-xs" />
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="number" placeholder="Total amount" value={bnplForm.total_amount || ''} onChange={(e) => setBnplForm({ ...bnplForm, total_amount: e.target.value as any })} className="glass-input px-2 py-1.5 rounded text-xs" />
                  <input type="number" placeholder="Remaining" value={bnplForm.remaining_amount || ''} onChange={(e) => setBnplForm({ ...bnplForm, remaining_amount: e.target.value as any })} className="glass-input px-2 py-1.5 rounded text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input type="number" placeholder="Next payment $" value={bnplForm.next_payment_amount || ''} onChange={(e) => setBnplForm({ ...bnplForm, next_payment_amount: e.target.value as any })} className="glass-input px-2 py-1.5 rounded text-xs" />
                  <input type="date" value={bnplForm.next_payment_date || ''} onChange={(e) => setBnplForm({ ...bnplForm, next_payment_date: e.target.value })} className="glass-input px-2 py-1.5 rounded text-xs" />
                </div>
                <button onClick={addBnpl} className="glass-btn w-full py-1.5 rounded text-xs font-semibold">Add</button>
              </div>
            )}

            <div className="space-y-2">
              {bnplPlans.length === 0 && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No BNPL plans tracked.</p>}
              {bnplPlans.map((p) => (
                <div key={p.id} className="rounded-lg p-2 text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{p.vendor}</span>
                    <span className="font-semibold" style={{ color: '#d4a373', filter: bnplVisible ? 'none' : 'blur(4px)' }}>
                      {mask(money(p.remaining_amount))} left
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {p.installments_remaining != null ? `${p.installments_remaining} payments left` : ''}
                      {p.next_payment_date ? ` • next ${new Date(p.next_payment_date).toLocaleDateString()}` : ''}
                    </span>
                    <button onClick={() => deleteBnpl(p.id)}><Trash2 size={12} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Statement upload ── */}
      <div className="glass-surface rounded-xl p-4 mt-4" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#d4a373' }}>
            <Upload size={14} /> Import a Statement
          </h3>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <button onClick={() => fileInputRef.current?.click()} className="glass-btn px-3 py-1.5 rounded text-xs font-semibold">
            Upload CSV
          </button>
        </div>
        <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Export your PayPal or bank statement as CSV, then upload it here to pull out transactions you can add as a balance or a recurring bill.
        </p>

        {uploadError && (
          <div className="text-xs rounded p-2 mb-2" style={{ background: 'rgba(224,120,86,0.12)', color: '#e07856' }}>
            {uploadError}
          </div>
        )}

        {statementRows && (
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <th className="text-left font-normal py-1">Date</th>
                  <th className="text-left font-normal py-1">Description</th>
                  <th className="text-right font-normal py-1">Amount</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {statementRows.map((row, idx) => (
                  <tr key={idx} style={{ borderTop: '1px solid rgba(184,115,51,0.1)' }}>
                    <td className="py-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{row.date || '—'}</td>
                    <td className="py-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>{row.description}</td>
                    <td className="py-1.5 text-right" style={{ color: '#d4a373' }}>{money(row.amount)}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => importRowAsBalance(row)} className="text-[10px] px-1.5 py-0.5 rounded mr-1" style={{ background: 'rgba(184,115,51,0.15)', color: '#d4a373' }}>
                        + Balance
                      </button>
                      <button onClick={() => importRowAsBill(row)} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(184,115,51,0.15)', color: '#d4a373' }}>
                        + Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={() => setStatementRows(null)} className="text-xs flex items-center gap-1 mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <X size={12} /> Clear preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
