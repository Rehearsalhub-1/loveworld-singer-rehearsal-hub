"use client";

import React from 'react';
import { Users, Shield, ShieldCheck } from 'lucide-react';

export default function UserManagement() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">User Management Coming Soon</h3>
        <p className="text-gray-500 mb-4">
          This feature is currently under development. You'll be able to manage users, roles, and permissions here.
        </p>
        <div className="flex justify-center space-x-4 text-sm text-gray-400">
          <div className="flex items-center">
            <Shield className="w-4 h-4 mr-1" />
            Admin Roles
          </div>
          <div className="flex items-center">
            <ShieldCheck className="w-4 h-4 mr-1" />
            User Permissions
          </div>
        </div>
      </div>
    </div>
  );
}