// SmartCat Feeder - Schedules Page
// Create, edit, delete, and toggle automatic feeding schedules.

import React, { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { Schedule } from '../types';
import { Plus, Edit2, Trash2, Clock, Check, X, AlertCircle, RefreshCw } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function DaySelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const selected = value.split(',').filter(Boolean).map(Number);

  const toggle = (day: number) => {
    const next = selected.includes(day)
      ? selected.filter((d) => d !== day)
      : [...selected, day].sort();
    onChange(next.join(','));
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      {DAYS.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => toggle(i)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            selected.includes(i)
              ? 'bg-cat-500 text-white border-cat-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-cat-300'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

const emptyForm = { name: '', time: '08:00', portion: 1, enabled: true, daysOfWeek: '1,2,3,4,5' };

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await api.get('/schedules');
      setSchedules(res.data.schedules);
    } catch (_) {
      //
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (s: Schedule) => {
    setEditId(s.id);
    setForm({ name: s.name, time: s.time, portion: s.portion, enabled: s.enabled, daysOfWeek: s.daysOfWeek });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.daysOfWeek) { setError('Please select at least one day'); return; }
    setSaving(true);
    setError('');

    try {
      if (editId) {
        await api.put(`/schedules/${editId}`, form);
      } else {
        await api.post('/schedules', form);
      }
      await fetchSchedules();
      setShowForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Save failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this schedule?')) return;
    await api.delete(`/schedules/${id}`);
    await fetchSchedules();
  };

  const handleToggle = async (id: string) => {
    await api.patch(`/schedules/${id}/toggle`);
    await fetchSchedules();
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="text-gray-500 text-sm mt-1">Automate feeding times for your cat</p>
        </div>
        <button id="create-schedule-btn" onClick={openCreate} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Add Schedule</span>
        </button>
      </div>

      {/* Schedule Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editId ? 'Edit Schedule' : 'New Schedule'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex gap-2 items-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Schedule name</label>
                <input
                  className="input"
                  placeholder="e.g. Morning Feeding"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Time (24h)</label>
                  <input
                    type="time"
                    className="input"
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Portion</label>
                  <select
                    className="input"
                    value={form.portion}
                    onChange={(e) => setForm({ ...form, portion: parseInt(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5].map((p) => (
                      <option key={p} value={p}>{p} portion{p > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Days of the week</label>
                <DaySelector
                  value={form.daysOfWeek}
                  onChange={(val) => setForm({ ...form, daysOfWeek: val })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled-check"
                  checked={form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="w-4 h-4 accent-cat-500"
                />
                <label htmlFor="enabled-check" className="text-sm text-gray-700">Enable this schedule</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center gap-1.5">
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editId ? 'Update' : 'Create'}</span>
                    </>
                  )}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="flex justify-center py-16 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          <span>Loading schedules...</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 flex flex-col items-center justify-center">
          <Clock className="w-12 h-12 text-gray-300 mb-3" />
          <p className="font-semibold text-gray-700">No schedules yet</p>
          <p className="text-sm mt-1">Create a schedule to automate feeding times</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {schedules.map((s) => (
            <div key={s.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-opacity ${!s.enabled ? 'bg-gray-50/50 border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900">{s.name}</span>
                  {!s.enabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-500 mt-1.5 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {s.time}
                  </span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span>Portion: {s.portion}</span>
                  <span className="hidden sm:inline text-gray-300">|</span>
                  <span className="truncate">{s.daysOfWeek.split(',').map((d) => DAYS[Number(d)]).join(', ')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 w-full sm:w-auto justify-between sm:justify-start pt-3 sm:pt-0 border-t border-gray-100 sm:border-0">
                {/* Disable/Enable Action Button */}
                <button
                  onClick={() => handleToggle(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    s.enabled
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  }`}
                >
                  {s.enabled ? 'Disable' : 'Enable'}
                </button>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(s)} className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1">
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="btn-danger py-1.5 px-3 text-xs flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
