// SmartCat Feeder - History Page
// Paginated feed log table with source, status, and date filters.

import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import type { FeedLog } from '../types';
import { 
  Globe, Smartphone, Clock, CheckCircle2, XCircle, Loader2, ChevronLeft, ChevronRight, Filter, RefreshCw 
} from 'lucide-react';

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    WEB: 'bg-blue-50 text-blue-700 border-blue-100',
    TELEGRAM: 'bg-purple-50 text-purple-700 border-purple-100',
    SCHEDULE: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const getIcon = () => {
    if (source === 'WEB') return <Globe className="w-3.5 h-3.5" />;
    if (source === 'TELEGRAM') return <Smartphone className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[source] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {getIcon()}
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Success
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
      <Loader2 className="w-3.5 h-3.5 animate-spin" />
      Pending
    </span>
  );
}

export default function HistoryPage() {
  const [feeds, setFeeds]   = useState<FeedLog[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    source: '',
    status: '',
    from: '',
    to: '',
  });

  const limit = 15;

  const fetchFeeds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        page: String(page),
        ...(filters.source && { source: filters.source }),
        ...(filters.status && { status: filters.status }),
        ...(filters.from   && { from:   filters.from }),
        ...(filters.to     && { to:     filters.to }),
      });

      const res = await api.get(`/feeds?${params}`);
      setFeeds(res.data.feeds);
      setTotal(res.data.total);
    } catch (_err) {
      //
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed History</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total records</p>
        </div>
        <button
          onClick={fetchFeeds}
          className="btn-ghost p-2 rounded-lg"
          title="Refresh List"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Filters */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-bold border-b border-gray-50 pb-2">
          <Filter className="w-4.5 h-4.5 text-cat-500" />
          <span className="text-sm">Filter Records</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Source</label>
            <select
              className="input"
              value={filters.source}
              onChange={(e) => { setFilters({ ...filters, source: e.target.value }); setPage(1); }}
            >
              <option value="">All Sources</option>
              <option value="WEB">Web</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="SCHEDULE">Schedule</option>
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={filters.status}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          <div>
            <label className="label">From date</label>
            <input
              type="date"
              className="input"
              value={filters.from}
              onChange={(e) => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
            />
          </div>

          <div>
            <label className="label">To date</label>
            <input
              type="date"
              className="input"
              value={filters.to}
              onChange={(e) => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
            />
          </div>
        </div>

        <div className="flex justify-start">
          <button
            onClick={() => { setFilters({ source: '', status: '', from: '', to: '' }); setPage(1); }}
            className="text-xs text-gray-500 hover:text-cat-600 font-semibold"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0 border border-gray-100 shadow-card">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin mr-2 text-cat-500" />
            <span>Loading feed history...</span>
          </div>
        ) : feeds.length === 0 ? (
          <div className="text-center text-gray-400 py-16">No records found.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="hidden md:table w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/75">
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">Date & Time</th>
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">Source</th>
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">User</th>
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">Portion</th>
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-gray-500 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {feeds.map((feed) => (
                  <tr
                    key={feed.id}
                    className="hover:bg-gray-50/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-700 font-medium">
                      {new Date(feed.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5"><SourceBadge source={feed.source} /></td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">{feed.userName}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-mono font-medium">{feed.portion}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={feed.status} /></td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{feed.message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-gray-100">
              {feeds.map((feed) => (
                <div key={feed.id} className="p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">
                      {new Date(feed.createdAt).toLocaleString()}
                    </span>
                    <StatusBadge status={feed.status} />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-gray-900">{feed.userName}</span>
                    <span className="text-gray-500 font-medium text-xs">Portion: {feed.portion}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <SourceBadge source={feed.source} />
                    <span className="text-gray-400 max-w-[180px] truncate" title={feed.message || ''}>
                      {feed.message || '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost py-1.5 px-3.5 text-xs flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>
          <span className="text-sm font-semibold text-gray-600 bg-white border border-gray-150 px-3 py-1.5 rounded-xl shadow-sm">
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost py-1.5 px-3.5 text-xs flex items-center gap-1 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
