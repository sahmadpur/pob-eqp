'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';

interface UserRow {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  accountStatus: string;
  createdAt: string;
  lastLoginAt: string | null;
  individualProfile: { firstName: string; lastName: string } | null;
  legalProfile: { companyName: string; registrationStatus: string } | null;
}

const ROLE_COLORS: Record<string, string> = {
  ADMINISTRATOR: 'bg-red-100 text-red-700',
  SYSTEM_ADMINISTRATOR: 'bg-purple-100 text-purple-700',
  FINANCE_OFFICER: 'bg-blue-100 text-blue-700',
  CUSTOMER_INDIVIDUAL: 'bg-green-100 text-green-700',
  CUSTOMER_LEGAL: 'bg-teal-100 text-teal-700',
  CONTROL_TOWER_OPERATOR: 'bg-orange-100 text-orange-700',
  GATE_CONTROLLER: 'bg-yellow-100 text-yellow-700',
  PARKING_CONTROLLER: 'bg-lime-100 text-lime-700',
  BORDER_OFFICER: 'bg-indigo-100 text-indigo-700',
  TERMINAL_OPERATOR: 'bg-pink-100 text-pink-700',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-700',
  PENDING_REVIEW: 'bg-blue-100 text-blue-700',
  REJECTED: 'bg-gray-100 text-gray-600',
};

export default function UsersPage() {
  const t = useTranslations('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.accountStatus = statusFilter;
      const { data } = await apiClient.get<{ data: UserRow[] }>('/admin/users', { params });
      setUsers(data.data);
    } catch {
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchUsers(); }, [roleFilter, statusFilter]);

  const updateStatus = async (userId: string, newStatus: string) => {
    setUpdating(userId);
    try {
      await apiClient.patch(`/admin/users/${userId}/status`, { accountStatus: newStatus });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, accountStatus: newStatus } : u));
    } catch {
      alert(t('failedToUpdate'));
    } finally {
      setUpdating(null);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(t('confirmDelete', { email }))) return;
    setUpdating(userId);
    try {
      await apiClient.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      alert(t('failedToDelete'));
    } finally {
      setUpdating(null);
    }
  };

  const displayName = (u: UserRow) => {
    if (u.individualProfile) return `${u.individualProfile.firstName} ${u.individualProfile.lastName}`;
    if (u.legalProfile) return u.legalProfile.companyName;
    return '—';
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q) ||
      displayName(u).toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('totalUsers', { count: users.length })}</p>
        </div>
        <button
          onClick={fetchUsers}
          className="text-sm bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-lg transition-colors"
        >
          {t('refresh')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('allRoles')}</option>
          <option value="CUSTOMER_INDIVIDUAL">Customer (Individual)</option>
          <option value="CUSTOMER_LEGAL">Customer (Legal)</option>
          <option value="FINANCE_OFFICER">Finance Officer</option>
          <option value="ADMINISTRATOR">Administrator</option>
          <option value="SYSTEM_ADMINISTRATOR">System Administrator</option>
          <option value="CONTROL_TOWER_OPERATOR">Control Tower Operator</option>
          <option value="GATE_CONTROLLER">Gate Controller</option>
          <option value="PARKING_CONTROLLER">Parking Controller</option>
          <option value="BORDER_OFFICER">Border Officer</option>
          <option value="TERMINAL_OPERATOR">Terminal Operator</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('allStatuses')}</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
          <option value="PENDING_REVIEW">Pending Review</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Table */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          {t('loadingUsers')}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colNameCompany')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colEmail')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colRole')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colStatus')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colLastLogin')}</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">{t('noUsersFound')}</td>
                  </tr>
                )}
                {filtered.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${updating === u.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{displayName(u)}</p>
                      {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[u.accountStatus] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.accountStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : t('never')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.accountStatus === 'ACTIVE' ? (
                          <button
                            onClick={() => updateStatus(u.id, 'SUSPENDED')}
                            disabled={!!updating}
                            className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                          >
                            {t('suspend')}
                          </button>
                        ) : u.accountStatus === 'SUSPENDED' ? (
                          <button
                            onClick={() => updateStatus(u.id, 'ACTIVE')}
                            disabled={!!updating}
                            className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
                          >
                            {t('activate')}
                          </button>
                        ) : null}
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          disabled={!!updating}
                          className="text-xs text-gray-400 hover:text-red-600 font-medium disabled:opacity-50"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
