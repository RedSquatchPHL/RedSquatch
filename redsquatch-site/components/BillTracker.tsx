import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Calendar, DollarSign } from 'lucide-react';

interface Bill {
  id: string;
  name: string;
  vendor?: string;
  amount: number;
  dueDate: number;
  category: 'utilities' | 'subscriptions' | 'insurance' | 'other';
  frequency: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface BillPayment {
  id: string;
  billId: string;
  amount: number;
  paidDate: string;
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
}

const CATEGORIES = {
  utilities: 'Utilities',
  subscriptions: 'Subscriptions',
  insurance: 'Insurance',
  other: 'Other',
};

const generateId = () => crypto.randomUUID();

const getBillsStorage = (): Bill[] => {
  try {
    const data = localStorage.getItem('bills-ledger');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getPaymentsStorage = (): BillPayment[] => {
  try {
    const data = localStorage.getItem('bill-payments');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveBills = (bills: Bill[]) => {
  localStorage.setItem('bills-ledger', JSON.stringify(bills));
};

const savePayments = (payments: BillPayment[]) => {
  localStorage.setItem('bill-payments', JSON.stringify(payments));
};

const getDaysUntilDue = (dueDate: number): number => {
  const today = new Date();
  const thisMonthDue = new Date(today.getFullYear(), today.getMonth(), dueDate);

  if (thisMonthDue < today) {
    return new Date(today.getFullYear(), today.getMonth() + 1, dueDate).getDate() - today.getDate() + dueDate;
  }
  return thisMonthDue.getDate() - today.getDate();
};

export default function BillTracker() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<BillPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formData, setFormData] = useState<Partial<Bill>>({
    category: 'utilities',
    frequency: 'monthly',
    isActive: true,
  });

  useEffect(() => {
    setBills(getBillsStorage());
    setPayments(getPaymentsStorage());
  }, []);

  const handleAddBill = () => {
    if (!formData.name || !formData.amount || formData.dueDate === undefined) return;

    const newBill: Bill = {
      id: editingBill?.id || generateId(),
      name: formData.name,
      vendor: formData.vendor,
      amount: formData.amount,
      dueDate: formData.dueDate,
      category: formData.category as Bill['category'],
      frequency: formData.frequency as Bill['frequency'],
      isActive: formData.isActive ?? true,
      notes: formData.notes,
      createdAt: editingBill?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let updated = bills;
    if (editingBill) {
      updated = bills.map((b) => (b.id === editingBill.id ? newBill : b));
    } else {
      updated = [...bills, newBill];
    }

    setBills(updated);
    saveBills(updated);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ category: 'utilities', frequency: 'monthly', isActive: true });
    setEditingBill(null);
    setShowForm(false);
  };

  const handleDeleteBill = (id: string) => {
    const updated = bills.filter((b) => b.id !== id);
    setBills(updated);
    saveBills(updated);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setFormData(bill);
    setShowForm(true);
    setSelectedBill(null);
  };

  const handleMarkPaid = (billId: string, amount: number) => {
    const newPayment: BillPayment = {
      id: generateId(),
      billId,
      amount,
      paidDate: new Date().toISOString().split('T')[0],
      status: 'paid',
    };

    const updated = [...payments, newPayment];
    setPayments(updated);
    savePayments(updated);
  };

  const activeBills = bills.filter((b) => b.isActive);
  const totalMonthly = activeBills.reduce((sum, b) => {
    if (b.frequency === 'monthly') return sum + b.amount;
    if (b.frequency === 'quarterly') return sum + b.amount / 3;
    if (b.frequency === 'yearly') return sum + b.amount / 12;
    return sum;
  }, 0);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#d4a373', textShadow: '0 0 16px rgba(184,115,51,0.3)' }}>
          Bills
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="glass-btn flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus size={18} />
          Add Bill
        </button>
      </div>

      {/* Summary */}
      <div className="mb-6 glass-surface rounded-xl p-4" style={{ border: '1px solid rgba(184,115,51,0.25)' }}>
        <div className="flex items-center gap-2" style={{ color: '#d4a373' }}>
          <DollarSign size={20} />
          <span className="text-lg font-semibold">
            ~${totalMonthly.toFixed(2)}/month (active bills)
          </span>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 glass-surface rounded-xl p-4" style={{ border: '1px solid rgba(184,115,51,0.3)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: '#d4a373' }}>
            {editingBill ? 'Edit Bill' : 'New Bill'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Bill name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass-input px-3 py-2 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Vendor (optional)"
              value={formData.vendor || ''}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="glass-input px-3 py-2 rounded text-sm"
            />

            <input
              type="number"
              placeholder="Amount"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              className="glass-input px-3 py-2 rounded text-sm"
            />
            <input
              type="number"
              placeholder="Due date (day of month)"
              min="1"
              max="31"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData({ ...formData, dueDate: parseInt(e.target.value) })}
              className="glass-input px-3 py-2 rounded text-sm"
            />

            <select
              value={formData.category || 'utilities'}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as Bill['category'] })
              }
              className="glass-input px-3 py-2 rounded text-sm"
            >
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={formData.frequency || 'monthly'}
              onChange={(e) =>
                setFormData({ ...formData, frequency: e.target.value as Bill['frequency'] })
              }
              className="glass-input px-3 py-2 rounded text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="glass-input w-full px-3 py-2 rounded text-sm mb-4"
            rows={2}
          />

          <div className="flex gap-2">
            <button
              onClick={handleAddBill}
              className="glass-btn flex-1 px-4 py-2 rounded-lg text-sm font-semibold"
            >
              {editingBill ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="flex-1 px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bills List */}
      <div className="space-y-3">
        {activeBills.length === 0 ? (
          <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            No bills yet. Add one to get started.
          </p>
        ) : (
          activeBills.map((bill) => {
            const daysUntil = getDaysUntilDue(bill.dueDate);
            const isOverdue = daysUntil < 0;
            const isDueSoon = daysUntil >= 0 && daysUntil <= 5;

            return (
              <div
                key={bill.id}
                onClick={() => setSelectedBill(selectedBill?.id === bill.id ? null : bill)}
                className="rounded-xl p-4 cursor-pointer transition-colors"
                style={{
                  background: selectedBill?.id === bill.id ? 'rgba(184,115,51,0.10)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedBill?.id === bill.id ? '#b87333' : 'rgba(184,115,51,0.2)'}`,
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold" style={{ color: '#d4a373' }}>
                      {bill.name}
                      {bill.vendor && (
                        <span className="text-sm ml-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          ({bill.vendor})
                        </span>
                      )}
                    </h3>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {CATEGORIES[bill.category]} • {bill.frequency}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: '#d4a373' }}>
                      ${bill.amount.toFixed(2)}
                    </div>
                    <div
                      className="text-xs flex items-center gap-1 justify-end mt-1"
                      style={{ color: isOverdue ? '#e07856' : isDueSoon ? '#d4a373' : 'rgba(255,255,255,0.4)' }}
                    >
                      <Calendar size={14} />
                      {isOverdue
                        ? `${Math.abs(daysUntil)} days overdue`
                        : `Due in ${daysUntil} days`}
                    </div>
                  </div>
                </div>

                {selectedBill?.id === bill.id && (
                  <div className="mt-4 pt-4 space-y-2" style={{ borderTop: '1px solid rgba(184,115,51,0.2)' }}>
                    {bill.notes && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{bill.notes}</p>}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkPaid(bill.id, bill.amount);
                        }}
                        className="flex-1 px-3 py-2 rounded text-sm transition-colors"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)', color: '#4ade80' }}
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBill(bill);
                        }}
                        className="glass-btn px-3 py-2 rounded"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBill(bill.id);
                        }}
                        className="glass-btn-danger px-3 py-2 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
