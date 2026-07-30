import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { UserNote } from '../types';
import { StickyNote, Plus, Trash2, X, Loader2, AlertCircle, Calendar, FileText } from 'lucide-react';

interface MyNotesSectionProps {
  userId: string;
}

export default function MyNotesSection({ userId }: MyNotesSectionProps) {
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Real-time Firestore Listener
  useEffect(() => {
    if (!userId) return;

    const notesRef = collection(db, 'users', userId, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: UserNote[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title || 'Untitled Note',
          content: data.content || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setNotes(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching notes:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Handle Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('សូមបញ្ចូលចំណងជើងចំណាំ (Please enter note title)');
      return;
    }
    setSaving(true);
    setError('');

    try {
      await addDoc(collection(db, 'users', userId, 'notes'), {
        title: title.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString()
      });
      setTitle('');
      setContent('');
      setShowModal(false);
    } catch (err: any) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId, 'notes', noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <StickyNote className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f2a4a]">កំណត់ត្រារបស់ខ្ញុំ (My Notes)</h2>
            <p className="text-xs text-slate-500">
              រក្សាទុកកំណត់ត្រាសំខាន់ៗ និងគំនិតផ្សេងៗ ({notes.length} កំណត់ត្រា)
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setTitle('');
            setContent('');
            setError('');
            setShowModal(true);
          }}
          className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs font-medium">កំពុងទាញយកកំណត់ត្រា... (Loading notes...)</p>
        </div>
      ) : notes.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <StickyNote className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">មិនទាន់មានកំណត់ត្រានៅឡើយទេ</p>
            <p className="text-xs text-slate-400 mt-1">សូមចុចប៊ូតុង "New Note" ដើម្បីបង្កើតកំណត់ត្រាដំបូងរបស់អ្នក</p>
          </div>
          <button
            onClick={() => {
              setTitle('');
              setContent('');
              setError('');
              setShowModal(true);
            }}
            className="px-4 py-2 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
          >
            <Plus className="h-4 w-4" /> Create Note
          </button>
        </div>
      ) : (
        /* Notes Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const dateStr = new Date(note.createdAt).toLocaleDateString('km-KH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });

            return (
              <div
                key={note.id}
                className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition-all shadow-sm hover:shadow flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#0f2a4a] line-clamp-1" title={note.title}>
                      {note.title}
                    </h3>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-1 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                      title="លុបកំណត់ត្រា"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {note.content ? (
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {note.content}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">គ្មានខ្លឹមសារបន្ថែម (No content)</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {dateStr}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW NOTE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0f2a4a] flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-blue-600" />
                បង្កើតកំណត់ត្រាថ្មី (New Note)
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ចំណងជើងចំណាំ (Note Title) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧទាហរណ៍៖ កាលវិភាគប្រឡងឆមាសទី១"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ខ្លឹមសារ (Note Content - Optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="សរសេរព័ត៌មានលម្អិតនៅទីនេះ..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none resize-none"
                />
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
                  <span>Save Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
