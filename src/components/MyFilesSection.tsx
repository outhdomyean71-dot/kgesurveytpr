import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { UserFolder, UserFile } from '../types';
import { 
  Folder, FileText, Plus, FolderPlus, FilePlus, Trash2, HardDrive, 
  Filter, X, Loader2, AlertCircle, UploadCloud, Download, CheckCircle, File
} from 'lucide-react';

interface MyFilesSectionProps {
  userId: string;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileTypeLabel(mimeType?: string, fileName?: string): string {
  if (mimeType) {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return mimeType.split('/')[1]?.toUpperCase() || 'IMAGE';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'EXCEL';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PPTX';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'ZIP';
    if (mimeType.includes('text')) return 'TXT';
  }
  if (fileName) {
    const ext = fileName.split('.').pop()?.toUpperCase();
    if (ext && ext.length <= 5) return ext;
  }
  return 'FILE';
}

export default function MyFilesSection({ userId }: MyFilesSectionProps) {
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [files, setFiles] = useState<UserFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const [selectedFolderId, setSelectedFolderId] = useState<string | 'all'>('all');

  // Folder modal state
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);
  const [folderError, setFolderError] = useState('');

  // File Upload modal state
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customFileName, setCustomFileName] = useState('');
  const [fileFolderId, setFileFolderId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState('');
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!userId) {
      setLoadingFolders(false);
      setLoadingFiles(false);
      return;
    }

    // Folders listener
    const foldersRef = collection(db, 'users', userId, 'folders');
    const foldersQuery = query(foldersRef, orderBy('createdAt', 'desc'));
    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
      const folderList: UserFolder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        folderList.push({
          id: docSnap.id,
          name: data.name || 'Untitled Folder',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setFolders(folderList);
      setLoadingFolders(false);
    }, (err) => {
      console.error('Error fetching folders:', err);
      setLoadingFolders(false);
    });

    // Files listener
    const filesRef = collection(db, 'users', userId, 'files');
    const filesQuery = query(filesRef, orderBy('createdAt', 'desc'));
    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      const fileList: UserFile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fileList.push({
          id: docSnap.id,
          name: data.name || 'Untitled File',
          storagePath: data.storagePath || '',
          downloadURL: data.downloadURL || '',
          type: data.type || '',
          folderId: data.folderId || '',
          size: data.size || '0 B',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      setFiles(fileList);
      setLoadingFiles(false);
    }, (err) => {
      console.error('Error fetching files:', err);
      setLoadingFiles(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
    };
  }, [userId]);

  // Create Folder handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setFolderError('សូមចូលប្រើប្រាស់គណនីជាមុនសិន (Please sign in first)');
      return;
    }
    if (!folderName.trim()) {
      setFolderError('សូមបញ្ចូលឈ្មោះថត (Please enter folder name)');
      return;
    }
    setSavingFolder(true);
    setFolderError('');
    try {
      await addDoc(collection(db, 'users', userId, 'folders'), {
        name: folderName.trim(),
        createdAt: new Date().toISOString()
      });
      setFolderName('');
      setShowFolderModal(false);
    } catch (err: any) {
      console.error('Error creating folder:', err);
      setFolderError(err.message || 'Failed to create folder');
    } finally {
      setSavingFolder(false);
    }
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCustomFileName(file.name);
      setFileError('');
    }
  };

  // Upload File Handler (Storage + Firestore)
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setFileError('សូមចូលប្រើប្រាស់គណនីជាមុនសិន (Please sign in first)');
      return;
    }
    if (!selectedFile) {
      setFileError('សូមជ្រើសរើសឯកសារដើម្បីអាប់ឡូត (Please select a file to upload)');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setFileError('');

    try {
      const fileNameToSave = customFileName.trim() || selectedFile.name;
      // Storage path constraint: user_uploads/{uid}/{fileName}
      const safeStorageName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storagePath = `user_uploads/${userId}/${safeStorageName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Storage upload error:', error);
          setFileError(`ការអាប់ឡូតបានបរាជ័យ (Upload failed): ${error.message}`);
          setUploading(false);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Save metadata document to Firestore: users/{uid}/files/{fileId}
            await addDoc(collection(db, 'users', userId, 'files'), {
              name: fileNameToSave,
              storagePath: storagePath,
              downloadURL: downloadURL,
              size: formatFileSize(selectedFile.size),
              type: selectedFile.type || 'application/octet-stream',
              folderId: fileFolderId || '',
              createdAt: new Date().toISOString()
            });

            // Reset modal state
            setSelectedFile(null);
            setCustomFileName('');
            setFileFolderId('');
            setUploadProgress(0);
            setUploading(false);
            setShowFileModal(false);
          } catch (dbErr: any) {
            console.error('Firestore save error:', dbErr);
            setFileError(`បរាជ័យក្នុងការរក្សាទុកទិន្នន័យ (Failed to save metadata): ${dbErr.message}`);
            setUploading(false);
          }
        }
      );
    } catch (err: any) {
      console.error('Unexpected upload error:', err);
      setFileError(err.message || 'An unexpected error occurred during upload.');
      setUploading(false);
    }
  };

  // Delete File Handler
  const handleDeleteFile = async (file: UserFile) => {
    if (!userId) return;
    setDeletingFileId(file.id);

    try {
      if (file.storagePath) {
        const storageRef = ref(storage, file.storagePath);
        try {
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('Storage delete warning (file may not exist):', storageErr);
        }
      }
      await deleteDoc(doc(db, 'users', userId, 'files', file.id));
    } catch (err: any) {
      console.error('Error deleting file:', err);
    } finally {
      setDeletingFileId(null);
    }
  };

  // Delete Folder Handler
  const handleDeleteFolder = async (folderId: string) => {
    if (!userId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'folders', folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId('all');
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  // Download File Handler
  const handleDownloadFile = (file: UserFile) => {
    if (!file.downloadURL) return;
    const link = document.createElement('a');
    link.href = file.downloadURL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('download', file.name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered files
  const filteredFiles = selectedFolderId === 'all'
    ? files
    : files.filter(f => f.folderId === selectedFolderId);

  const isLoading = loadingFolders || loadingFiles;

  if (!userId) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <HardDrive className="h-6 w-6" />
        </div>
        <h3 className="font-bold text-base text-[#0f2a4a]">សូមចូលប្រើប្រាស់គណនីរបស់អ្នក</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          សូមចូលប្រើប្រាស់ (Sign In) ដើម្បីមើល និងអាប់ឡូតឯកសារផ្ទាល់ខ្លួនរបស់អ្នក។
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
            <HardDrive className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f2a4a]">ឯកសាររបស់ខ្ញុំ (My Files)</h2>
            <p className="text-xs text-slate-500">
              គ្រប់គ្រងថត និងឯកសារផ្ទាល់ខ្លួនរបស់អ្នក ({files.length} ឯកសារ, {folders.length} ថត)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFolderName('');
              setFolderError('');
              setShowFolderModal(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-200"
          >
            <FolderPlus className="h-4 w-4 text-amber-600" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => {
              setSelectedFile(null);
              setCustomFileName('');
              setFileFolderId(selectedFolderId !== 'all' ? selectedFolderId : '');
              setUploadProgress(0);
              setFileError('');
              setShowFileModal(true);
            }}
            className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl shadow-sm transition cursor-pointer flex items-center gap-1.5"
          >
            <FilePlus className="h-4 w-4" />
            <span>Add File</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-xs font-medium">កំពុងទាញយកទិន្នន័យ... (Loading files...)</p>
        </div>
      ) : (
        <>
          {/* Folders Row */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                ថតឯកសារ (Folders)
              </span>
              {selectedFolderId !== 'all' && (
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Filter className="h-3 w-3" /> បង្ហាញទាំងអស់ (Show All)
                </button>
              )}
            </div>

            {folders.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500">មិនទាន់មានថតនៅឡើយទេ (No folders created yet)</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <button
                  onClick={() => setSelectedFolderId('all')}
                  className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 cursor-pointer ${
                    selectedFolderId === 'all'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs truncate">ទាំងអស់ (All Files)</span>
                  </div>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                    {files.length}
                  </span>
                </button>

                {folders.map((folder) => {
                  const folderFileCount = files.filter(f => f.folderId === folder.id).length;
                  return (
                    <div
                      key={folder.id}
                      className={`p-3 rounded-2xl border text-left transition flex items-center justify-between gap-2 group relative ${
                        selectedFolderId === folder.id
                          ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="flex items-center gap-2 truncate flex-1 text-left cursor-pointer"
                      >
                        <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                        <span className="text-xs truncate" title={folder.name}>{folder.name}</span>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">
                          {folderFileCount}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                          title="លុបថត"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
                បញ្ជីឯកសារ (Files List)
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredFiles.length} ឯកសារ
              </span>
            </div>

            {filteredFiles.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-10 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">មិនទាន់មានឯកសារនៅឡើយទេ</p>
                  <p className="text-xs text-slate-400 mt-1">សូមចុចប៊ូតុង "Add File" ដើម្បីអាប់ឡូតឯកសារថ្មី</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setCustomFileName('');
                    setFileFolderId(selectedFolderId !== 'all' ? selectedFolderId : '');
                    setUploadProgress(0);
                    setFileError('');
                    setShowFileModal(true);
                  }}
                  className="px-4 py-2 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <Plus className="h-4 w-4" /> Add File
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">ឈ្មោះឯកសារ (File Name)</th>
                      <th className="px-4 py-3">ប្រភេទ (Type)</th>
                      <th className="px-4 py-3">ថត (Folder)</th>
                      <th className="px-4 py-3">ទំហំ (Size)</th>
                      <th className="px-4 py-3">កាលបរិច្ឆេទ (Date)</th>
                      <th className="px-4 py-3 text-right">សកម្មភាព (Actions)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFiles.map((file) => {
                      const folderObj = folders.find(f => f.id === file.folderId);
                      const formattedDate = new Date(file.createdAt).toLocaleDateString('km-KH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      });
                      const typeLabel = getFileTypeLabel(file.type, file.name);

                      return (
                        <tr key={file.id} className="hover:bg-amber-50/40 transition">
                          <td className="px-4 py-3.5 font-bold text-[#0f2a4a] flex items-center gap-2.5">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                              <FileText className="h-4 w-4" />
                            </div>
                            <span className="truncate max-w-[220px]" title={file.name}>
                              {file.name}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-extrabold uppercase">
                              {typeLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {folderObj ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                                <Folder className="h-3 w-3" />
                                {folderObj.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] font-normal">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                            {file.size}
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            {formattedDate}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {file.downloadURL && (
                                <button
                                  onClick={() => handleDownloadFile(file)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                  title="ទាញយកឯកសារ (Download)"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteFile(file)}
                                disabled={deletingFileId === file.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-50"
                                title="លុបឯកសារ (Delete)"
                              >
                                {deletingFileId === file.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* NEW FOLDER MODAL */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0f2a4a] flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-amber-500" />
                បង្កើតថតថ្មី (New Folder)
              </h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              {folderError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{folderError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ឈ្មោះថត (Folder Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="ឧទាហរណ៍៖ ឯកសារប្រឡង២០២៦"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {savingFolder && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Create</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD FILE MODAL */}
      {showFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-[#0f2a4a] flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-blue-600" />
                អាប់ឡូតឯកសារ (Upload File)
              </h3>
              <button
                onClick={() => !uploading && setShowFileModal(false)}
                disabled={uploading}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition disabled:opacity-30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadFile} className="space-y-4">
              {fileError && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 border border-rose-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Hidden Native File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Drag & Drop / Click Picker Box */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  selectedFile
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-slate-200 hover:border-amber-400 bg-slate-50 hover:bg-amber-50/20'
                } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                {selectedFile ? (
                  <>
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                      <File className="h-6 w-6" />
                    </div>
                    <div className="space-y-0.5 max-w-full">
                      <p className="text-xs font-bold text-[#0f2a4a] truncate px-4" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-600 font-bold underline mt-1">
                      ចុចដើម្បីប្តូរឯកសារ (Click to change file)
                    </span>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">ចុចនៅទីនេះដើម្បីជ្រើសរើសឯកសារ</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        គាំទ្រ PDF, Word, Excel, រូបភាព, ZIP និងផ្សេងៗ (Max 50MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Display File Name Input */}
              {selectedFile && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ឈ្មោះបង្ហាញ (Display File Name)
                  </label>
                  <input
                    type="text"
                    required
                    value={customFileName}
                    onChange={(e) => setCustomFileName(e.target.value)}
                    disabled={uploading}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none disabled:opacity-50"
                  />
                </div>
              )}

              {/* Folder Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ជ្រើសរើសថត (Select Folder - Optional)
                </label>
                <select
                  value={fileFolderId}
                  onChange={(e) => setFileFolderId(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none text-slate-800 disabled:opacity-50"
                >
                  <option value="">-- គ្មានថត (Root Folder) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              {/* Upload Progress Bar */}
              {uploading && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-[#0f2a4a]">
                    <span>កំពុងអាប់ឡូត... (Uploading...)</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  disabled={uploading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="px-4 py-2 bg-[#0f2a4a] hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Start Upload</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
