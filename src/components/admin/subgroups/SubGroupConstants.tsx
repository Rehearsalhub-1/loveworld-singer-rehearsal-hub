import React from 'react';
import { Building2, GraduationCap, Users, Sparkles, UsersRound, Clock, CheckCircle, XCircle } from 'lucide-react';

export interface SubGroup { [key: string]: any; id: string; name: string; type: string; status: string; }
export type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other';
export type SubGroupStatus = 'pending' | 'approved' | 'rejected' | 'active';


export const TYPE_ICONS: Record<SubGroupType, React.ReactNode> = {
  church: <Building2 className="w-4 h-4" />,
  campus: <GraduationCap className="w-4 h-4" />,
  cell: <Users className="w-4 h-4" />,
  youth: <Sparkles className="w-4 h-4" />,
  other: <UsersRound className="w-4 h-4" />
};

export const TYPE_LABELS: Record<SubGroupType, string> = {
  church: 'Church Choir',
  campus: 'Campus Fellowship',
  cell: 'Cell Group',
  youth: 'Youth Choir',
  other: 'Other'
};

export const STATUS_CONFIG: Record<SubGroupStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending Approval',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="w-3.5 h-3.5" />
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="w-3.5 h-3.5" />
  },
  rejected: { label: 'Rejected', color: 'text-red-700', icon: <></> },
  approved: { label: 'Approved', color: 'text-green-600', icon: <></> }
};
