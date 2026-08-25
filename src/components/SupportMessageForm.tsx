"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BackendAPI } from '@/lib/api-client';
import {
  Send,
  AlertCircle,
  CheckCircle,
  X,
  MessageSquare,
  User,
  Mail,
  FileText,
  Tag,
  AlertTriangle
} from 'lucide-react';

interface SupportMessageFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  subject: string;
  message: string;
  category: string;
  priority: string;
}

export default function SupportMessageForm({ isOpen, onClose, onSuccess }: SupportMessageFormProps) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    subject: '',
    message: '',
    category: 'general',
    priority: 'medium'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const categories = [
    { value: 'general', label: 'General Question', icon: '' },
    { value: 'technical', label: 'Technical Issue', icon: '' },
    { value: 'billing', label: 'Billing/Account', icon: '' },
    { value: 'feature', label: 'Feature Request', icon: '' },
    { value: 'bug', label: 'Bug Report', icon: '' },
    { value: 'other', label: 'Other', icon: '' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      setError('You must be logged in to submit a support message');
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await BackendAPI.generic.create('support_messages', {
        userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
        userEmail: profile.email,
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority,
        createdAt: new Date().toISOString()
      });

      

      setSuccess(true);
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'medium'
      });

      // Auto-close after success
      setTimeout(() => {
        setSuccess(false);
        onClose();
        onSuccess?.();
      }, 2000);

    } catch (error) {
 console.error('Error submitting support message:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit support message');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
              <img
                src="/logo.png"
                alt="LoveWorld Logo"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Contact Support</h2>
              <p className="text-sm text-gray-600">We're here to help you</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Sent!</h3>
            <p className="text-gray-600">
              Your support message has been submitted successfully. Our team will get back to you soon.
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* User Info Display */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{profile?.first_name} {profile?.last_name}</span>
                <Mail className="w-4 h-4 ml-2" />
                <span>{profile?.email}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Priority
              </label>
              <div className="grid grid-cols-2 gap-2">
                {priorities.map((priority) => (
                  <label key={priority.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`p-3 rounded-lg border-2 text-center transition-all ${
                      formData.priority === priority.value
                        ? `${priority.color} border-current`
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <span className="text-sm font-medium">{priority.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Subject *
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Brief description of your issue"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                required
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message *
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                placeholder="Please describe your issue in detail..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.subject.trim() || !formData.message.trim()}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
