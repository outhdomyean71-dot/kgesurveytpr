import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { TeamMember } from '../types';
import { Users, UserPlus, Trash2, X, Loader2, AlertCircle, ShieldCheck, UserCheck, Calendar } from 'lucide-react';

interface TeamMembersSectionProps {
  userId: string;
}

export default function TeamMembersSection({ userId }: TeamMembersSectionProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('គ្រូបង្រៀន (Teacher)');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Real-time Firestore Listener
  useEffect(() => {
    if (!userId) return;

    const membersRef = collection(db, 'users', userId, 'teamMembers');
    const q = query(membersRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          name: data.name || 'Unnamed Member',
          role: data.role || 'Member',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setMembers(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching team members:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('សូមបញ្ចូលឈ្មោះសមាជិក (Please enter member name)');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await addDoc(collection(db, 'users', userId, 'teamMembers'), {
        name: name.trim(),
        role: role.trim() || 'Member',
        createdAt: new Date().toISOString()
      });
      setName('');
      setRole('គ្រូបង្រៀន (Teacher)');
      setShowModal(false);
    } catch (err: any) {
      console.error('Error adding team member:', err);
      setError(err.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  // Delete Member
  const handleDeleteMember = async (memberId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'teamMembers', memberId));
    } catch (err) {
      console.error('Error deleting team member:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f2a4a]">សមាជិកក្រុម (Team Members)</h2>
            <p className="text-xs text-slate-500">
              គ្រប់គ្រងសមាជិក និងគ្រូបង្រៀនក្នុងក្រុមរបស់អ្នក ({members.length} នាក់)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setName('');
            setRole('គ្រូបង្រៀន (Teacher)');
            setError('');
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-medium">កំពុងទាញយកបញ្ជីសមាជិក... (Loading team...)</p>
        </div>
      ) : members.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">មិនទាន់មានសមាជិកក្រុមនៅឡើយទេ</p>
            <p className="text-xs text-slate-400 mt-1">សូមចុចប៊ូតុង "Add Member" ដើម្បីបន្ថែមសមាជិកថ្មី</p>
          </div>
          <button
            onClick={() => {
              setName('');
              setRole('គ្រូបង្រៀន (Teacher)');
              setError('');
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
          >
            <UserPlus className="h-4 w-4" /> Add Member
          </button>
        </div>
      ) : (
        /* Team Members List / Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const dateStr = new Date(member.createdAt).toLocaleDateString('km-KH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            // Get initials for avatar
            const initials = member.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'M';

            return (
              <div
                key={member.id}
                className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition-all shadow-sm flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 truncate">
                  <div className="h-10 w-10 rounded-xl bg-[#0f2a4a] text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-slate-700">
                    {initials}
                  </div>
                  <div className="truncate">
                    <h3 className="font-bold text-xs text-[#0f2a4a] truncate" title={member.name}>
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <ShieldCheck className="h-3 w-3" />
                        {member.role || 'Member'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 hidden xl:inline">
                    {dateStr}
                  </span>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="លុបសមាជិក"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0f2a4a] flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                បន្ថែមសមាជិកថ្មី (Add Team Member)
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ឈ្មោះសមាជិក (Member Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧទាហរណ៍៖ សុខ ចាន់ថា"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  តួនាទី / មុខងារ (Role)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-800"
                >
                  <option value="គ្រូបង្រៀន (Teacher)">គ្រូបង្រៀន (Teacher)</option>
                  <option value="អ្នកគ្រប់គ្រង (Admin)">អ្នកគ្រប់គ្រង (Admin)</option>
                  <option value="អ្នកសម្របសម្រួល (Coordinator)">អ្នកសម្របសម្រួល (Coordinator)</option>
                  <option value="ជំនួយការ (Assistant)">ជំនួយការ (Assistant)</option>
                  <option value="សមាជិក (Member)">សមាជិក (Member)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Add Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
