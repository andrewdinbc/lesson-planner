'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Tooltip from '@/components/Tooltip';

export default function Dashboard() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUnits = async () => {
      const { data, error } = await supabase
        .from('micro_units')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) setUnits(data);
      setLoading(false);
    };

    fetchUnits();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this micro-unit?')) return;
    
    const { error } = await supabase
      .from('micro_units')
      .delete()
      .eq('id', id);

    if (!error) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  const handleDuplicate = async (unit) => {
    const newUnit = { ...unit };
    delete newUnit.id;
    
    const { data, error } = await supabase
      .from('micro_units')
      .insert([newUnit])
      .select();

    if (!error && data) {
      setUnits([data[0], ...units]);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Dashboard</h1>
            <p className="text-slate-600">Manage your micro-units</p>
          </div>
          
          <Tooltip text="Create a new micro-unit from scratch" position="left">
            <Link
              href="/micro-units/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg 
                font-medium transition-colors shadow-md hover:shadow-lg"
            >
              + New Micro-Unit
            </Link>
          </Tooltip>
        </div>

        {/* Units Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500 text-lg mb-4">No micro-units yet</p>
              <Tooltip text="Start creating your first lesson unit" position="top">
                <Link
                  href="/micro-units/new"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white 
                    px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create First Unit
                </Link>
              </Tooltip>
            </div>
          ) : (
            units.map(unit => (
              <div key={unit.id} className="bg-white rounded-lg shadow-md hover:shadow-lg 
                transition-shadow overflow-hidden border border-slate-200">
                
                {/* Unit Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b 
                  border-slate-200">
                  <h3 className="font-semibold text-slate-900 text-lg truncate">
                    {unit.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{unit.grade_level}</p>
                </div>

                {/* Unit Content */}
                <div className="p-4">
                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {unit.description}
                  </p>
                  <div className="flex gap-2">
                    {/* View/Edit Button */}
                    <Tooltip text="View and edit unit details" position="top">
                      <Link
                        href={`/micro-units/${unit.id}`}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 
                          rounded text-sm font-medium transition-colors text-center"
                      >
                        View
                      </Link>
                    </Tooltip>

                    {/* Duplicate Button */}
                    <Tooltip text="Create a copy of this unit" position="top">
                      <button
                        onClick={() => handleDuplicate(unit)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 
                          rounded text-sm font-medium transition-colors"
                      >
                        Duplicate
                      </button>
                    </Tooltip>

                    {/* Delete Button */}
                    <Tooltip text="Permanently delete this unit" position="top">
                      <button
                        onClick={() => handleDelete(unit.id)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 
                          rounded text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Unit Metadata */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 text-xs 
                  text-slate-500">
                  <p>Created: {new Date(unit.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}