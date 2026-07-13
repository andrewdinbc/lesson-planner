'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Tooltip from '@/components/Tooltip';

export default function NewMicroUnit() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade_level: '9-12',
    subject: 'General',
    duration_hours: 1,
    learning_objectives: '',
    materials: '',
    assessment_method: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('micro_units')
      .insert([formData])
      .select();

    setLoading(false);

    if (!error && data) {
      router.push(`/micro-units/${data[0].id}`);
    } else {
      alert('Error creating micro-unit');
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('micro_units')
      .insert([{ ...formData, status: 'draft' }])
      .select();

    setLoading(false);

    if (!error && data) {
      router.push(`/micro-units/${data[0].id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Micro-Unit</h1>
          <p className="text-slate-600">Design a focused learning experience</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 
          border border-slate-200">
          
          {/* Title Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Unit Title
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Photosynthesis Basics"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              placeholder="Brief overview of what students will learn..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Grade & Subject Row */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Grade Level
              </label>
              <select
                name="grade_level"
                value={formData.grade_level}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>K-2</option>
                <option>3-5</option>
                <option>6-8</option>
                <option>9-12</option>
                <option>Post-Secondary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Subject
              </label>
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option>General</option>
                <option>Math</option>
                <option>Science</option>
                <option>ELA</option>
                <option>Social Studies</option>
                <option>Physical Education</option>
              </select>
            </div>
          </div>

          {/* Duration Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Duration (hours)
            </label>
            <input
              type="number"
              name="duration_hours"
              value={formData.duration_hours}
              onChange={handleChange}
              min="0.5"
              step="0.5"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Learning Objectives */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Learning Objectives
            </label>
            <textarea
              name="learning_objectives"
              value={formData.learning_objectives}
              onChange={handleChange}
              rows="3"
              placeholder="What students should be able to do after this unit..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Materials Field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Required Materials
            </label>
            <textarea
              name="materials"
              value={formData.materials}
              onChange={handleChange}
              rows="3"
              placeholder="List all materials and resources needed..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Assessment Method */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Assessment Method
            </label>
            <textarea
              name="assessment_method"
              value={formData.assessment_method}
              onChange={handleChange}
              rows="3"
              placeholder="How will you assess student understanding?..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg 
                focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-slate-200">
            {/* Save as Draft Button */}
            <Tooltip text="Save incomplete unit to finish later" position="top">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="px-6 py-3 bg-slate-500 hover:bg-slate-600 text-white rounded-lg 
                  font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save as Draft'}
              </button>
            </Tooltip>

            {/* Cancel Button */}
            <Tooltip text="Return to dashboard without saving" position="top">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg 
                  font-medium transition-colors"
              >
                Cancel
              </button>
            </Tooltip>

            {/* Publish Button */}
            <Tooltip text="Create and publish this micro-unit" position="top">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                  font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create & Publish'}
              </button>
            </Tooltip>
          </div>
        </form>
      </div>
    </div>
  );
}