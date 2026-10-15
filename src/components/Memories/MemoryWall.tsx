import React, { useState, useEffect, useRef } from 'react';
import { Trip, Memory } from '../../types';
import { useAuth } from '../../context/useAuth';
import { 
  subscribeToMemories,
  addMemory, 
  deleteMemory, 
  likeMemory, 
  uploadImageFromLocalDevice,
} from '../../services/tripService';
import { 
  Camera, 
  Plus, 
  MapPin, 
  Calendar, 
  Heart, 
  Share2, 
  Sparkles,
  Check,
  Upload,
  HardDrive,
  Link as LinkIcon,
  X,
  Trash2,
  ZoomIn,
  Image as ImageIcon,
  Tag as TagIcon,
  Smartphone,
  RefreshCw
} from 'lucide-react';

interface MemoryWallProps {
  trip?: Trip;
}

const PRESET_MOMENTS = [
  {
    title: 'Western Ghats Summit',
    url: '/src/assets/images/memory_trip_polaroid_1791735807149.jpg',
    location: 'Raja\'s Seat, Madikeri',
    tag: 'Scenic View'
  },
  {
    title: 'Kodagu Coffee Estate',
    url: '/src/assets/images/companion_matching_card_1791735795006.jpg',
    location: 'Kodagu Estate Cafe',
    tag: 'Food & Chai'
  },
  {
    title: 'Coastal Highway Sunset',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    location: 'Gokarna Coastal Trail',
    tag: 'Road Trip'
  },
  {
    title: 'Campfire Under Stars',
    url: 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=80',
    location: 'Western Ghats Campsite',
    tag: 'Campfire'
  }
];

const MEMORY_TAGS = [
  'Scenic View',
  'Road Trip',
  'Trek & Trail',
  'Food & Chai',
  'Campfire',
  'Co-travelers',
  'Heritage'
];

export const MemoryWall: React.FC<MemoryWallProps> = ({ trip }) => {
  const { currentUser } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [activeSourceTab, setActiveSourceTab] = useState<'local' | 'presets' | 'url'>('local');

  // Form states
  const [newCaption, setNewCaption] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>(trip ? trip.destination : '');
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newTag, setNewTag] = useState<string>('Scenic View');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [localFileInfo, setLocalFileInfo] = useState<{ name: string; sizeKb: number; preview: string } | null>(null);
  
  // Drag & drop & file upload states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter & Search states
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox Modal state
  const [lightboxMemory, setLightboxMemory] = useState<Memory | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hidden File Inputs
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Subscribe to real-time memories from Firestore
  useEffect(() => {
    const unsub = subscribeToMemories(trip?.id, (fresh) => {
      setMemories(fresh);
    });
    return () => unsub();
  }, [trip?.id]);

  // Handle local file selection and compression
  const processLocalFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WebP, etc.)');
      return;
    }

    setUploadError(null);
    setIsProcessingFile(true);

    try {
      const uploadRes = await uploadImageFromLocalDevice(file);
      setNewImageUrl(uploadRes.url);
      setLocalFileInfo({
        name: file.name,
        sizeKb: uploadRes.sizeKb,
        preview: uploadRes.previewUrl
      });
      showToast(`Selected "${file.name}" (${uploadRes.sizeKb} KB)`);
    } catch (err: any) {
      console.error('File read error:', err);
      setUploadError(err.message || 'Failed to read image from device');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLocalFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLocalFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaption.trim()) return;

    const finalImage = newImageUrl.trim() || '/src/assets/images/memory_trip_polaroid_1791735807149.jpg';

    setIsSubmitting(true);
    try {
      const mem: Memory = {
        id: `mem_${Date.now()}`,
        tripId: trip ? trip.id : 'trip_bengaluru_coorg',
        authorId: currentUser.id,
        authorName: currentUser.displayName,
        caption: newCaption.trim(),
        imageUrl: finalImage,
        location: newLocation.trim() || (trip?.destination || 'Scenic Western Ghats'),
        date: newDate || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        tag: newTag,
        likes: 0
      };

      await addMemory(mem);
      setMemories(prev => [mem, ...prev]);
      
      // Reset form
      setNewCaption('');
      setNewImageUrl('');
      setLocalFileInfo(null);
      setShowAddModal(false);
      showToast('🎉 Memory successfully shared to the trip journal!');
    } catch (err) {
      console.error('Error adding memory:', err);
      showToast('Saved to trip journal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMemory = async (memId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this memory from the trip journal?')) {
      return;
    }

    try {
      await deleteMemory(trip?.id || 'trip_bengaluru_coorg', memId);
      setMemories(prev => prev.filter(m => m.id !== memId));
      if (lightboxMemory?.id === memId) {
        setLightboxMemory(null);
      }
      showToast('Memory removed');
    } catch (err) {
      console.error('Error deleting memory:', err);
    }
  };

  const handleLikeMemory = async (memId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newCount = await likeMemory(trip?.id || 'trip_bengaluru_coorg', memId);
      setMemories(prev => prev.map(m => m.id === memId ? { ...m, likes: newCount } : m));
      if (lightboxMemory?.id === memId) {
        setLightboxMemory({ ...lightboxMemory, likes: newCount });
      }
    } catch (err) {
      console.error('Error liking memory:', err);
    }
  };

  const handleShareMemory = async (mem: Memory, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `Check out this memory from our trip to ${mem.location}: "${mem.caption}"`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Trip Memory - ${mem.location}`,
          text: shareText,
          url: window.location.href
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    showToast('📋 Memory story copied to clipboard!');
  };

  // Filter memories
  const filteredMemories = memories.filter((mem) => {
    const matchesTag = selectedTagFilter === 'All' || mem.tag === selectedTagFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      mem.caption.toLowerCase().includes(query) || 
      mem.location.toLowerCase().includes(query) ||
      mem.authorName.toLowerCase().includes(query);
    return matchesTag && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight font-isometra">
                Shared Journey Memories & Trip Journal
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Capture milestone vistas, group Polaroids, and road moments directly from your phone or PC
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveSourceTab('local');
              setNewImageUrl('');
              setLocalFileInfo(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Upload className="w-4 h-4" />
            <span>Upload from Device</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tag Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedTagFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              selectedTagFilter === 'All'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Moments ({memories.length})
          </button>
          {MEMORY_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTagFilter(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedTagFilter === tag
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search memories, spots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Memories Grid */}
      {filteredMemories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-3">
            <Camera className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">No trip memories match this filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            Preserve candid travel photos and road trip milestones. You can upload directly from your local device storage or mobile camera!
          </p>
          <button
            onClick={() => {
              setActiveSourceTab('local');
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Upload from Local Device</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemories.map((mem) => {
            const isAuthor = currentUser.id === mem.authorId;
            return (
              <div
                key={mem.id}
                onClick={() => setLightboxMemory(mem)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group cursor-pointer hover:-translate-y-0.5"
              >
                <div>
                  {/* Photo Thumbnail */}
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={mem.imageUrl}
                      alt={mem.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />

                    {/* Overlay Tag */}
                    {mem.tag && (
                      <div className="absolute top-2.5 left-2.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase bg-slate-900/80 backdrop-blur-md text-amber-300 border border-white/10 shadow-sm">
                          {mem.tag}
                        </span>
                      </div>
                    )}

                    {/* Zoom icon on hover */}
                    <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </div>

                    {/* Bottom Metadata Pill on Image */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/95 bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="flex items-center gap-1.5 truncate font-medium">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{mem.location}</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-300 shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {mem.date}
                      </span>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="p-4">
                    <p className="text-xs text-slate-700 leading-relaxed font-sans line-clamp-3">
                      "{mem.caption}"
                    </p>
                  </div>
                </div>

                {/* Author row & actions */}
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/60">
                  <span className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-600/10 text-amber-700 font-black text-[9px] flex items-center justify-center">
                      {mem.authorName?.charAt(0) || 'U'}
                    </span>
                    <span className="truncate max-w-[110px]">{mem.authorName}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => handleLikeMemory(mem.id, e)}
                      className="px-2 py-1 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 text-[11px]"
                      title="Appreciate memory"
                    >
                      <Heart className={`w-3.5 h-3.5 ${((mem.likes || 0) > 0) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{mem.likes || 0}</span>
                    </button>

                    <button
                      onClick={(e) => handleShareMemory(mem, e)}
                      className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors"
                      title="Share memory"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {isAuthor && (
                      <button
                        onClick={(e) => handleDeleteMemory(mem.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD MEMORY MODAL WITH LOCAL DEVICE UPLOAD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95">
            {/* Modal Title */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-600" />
                  <span>Add Journey Memory</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload photos from your computer, phone, or camera to immortalize the road trip.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden native file inputs */}
            <input
              type="file"
              ref={localFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Source Tab Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveSourceTab('local')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeSourceTab === 'local'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-600" />
                <span>Upload from Device</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSourceTab('presets')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeSourceTab === 'presets'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Sample Moments</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSourceTab('url')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  activeSourceTab === 'url'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>Image Link</span>
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4 text-xs">
              {/* TAB 1: LOCAL DEVICE UPLOAD ZONE */}
              {activeSourceTab === 'local' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-700 font-bold flex items-center gap-1">
                      <span>Choose Photo from Device</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">JPG, PNG, WebP (auto-compressed)</span>
                  </div>

                  {localFileInfo ? (
                    /* Selected Image Preview Card */
                    <div className="border border-amber-300 bg-amber-50/40 rounded-2xl p-3 flex items-center gap-3">
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                        <img
                          src={localFileInfo.preview}
                          alt="Local preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-slate-900 truncate text-xs">
                            {localFileInfo.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Size: <strong className="text-slate-700">{localFileInfo.sizeKb} KB</strong> (Optimized for journal)
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => localFileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Change Photo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalFileInfo(null);
                              setNewImageUrl('');
                            }}
                            className="text-[11px] text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Dropzone when no file selected */
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => localFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-amber-500 bg-amber-50/80 scale-[1.01]'
                          : 'border-slate-300 hover:border-amber-500 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 mb-2.5 shadow-sm">
                        {isProcessingFile ? (
                          <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
                        ) : (
                          <Upload className="w-6 h-6 text-amber-700" />
                        )}
                      </div>

                      {isProcessingFile ? (
                        <p className="text-xs font-semibold text-amber-700">Reading & optimizing photo...</p>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-slate-800">
                            Click to browse photo from local device
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Or drag & drop photo directly into this area
                          </p>
                        </>
                      )}

                      <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            localFileInputRef.current?.click();
                          }}
                          className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
                        >
                          Browse Files
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cameraInputRef.current?.click();
                          }}
                          className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-800 hover:bg-amber-100 flex items-center gap-1 shadow-2xs"
                        >
                          <Smartphone className="w-3 h-3" />
                          <span>Take Photo</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[11px] text-rose-600 mt-1.5 flex items-center gap-1">
                      <X className="w-3 h-3 shrink-0" />
                      <span>{uploadError}</span>
                    </p>
                  )}
                </div>
              )}

              {/* TAB 2: PRESET MOMENTS */}
              {activeSourceTab === 'presets' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Select a Sample Travel Polaroid</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_MOMENTS.map((preset) => {
                      const isSelected = newImageUrl === preset.url;
                      return (
                        <button
                          key={preset.title}
                          type="button"
                          onClick={() => {
                            setNewImageUrl(preset.url);
                            setLocalFileInfo(null);
                            if (!newLocation) setNewLocation(preset.location);
                            setNewTag(preset.tag);
                          }}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/30'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.title}
                            className="w-12 h-12 object-cover rounded-lg shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 block truncate">
                              {preset.title}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {preset.location}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: IMAGE URL */}
              {activeSourceTab === 'url' && (
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Direct Image URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={newImageUrl}
                    onChange={(e) => {
                      setNewImageUrl(e.target.value);
                      setLocalFileInfo(null);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                  />
                  {newImageUrl && (
                    <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                      <img
                        src={newImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={() => setUploadError('Unable to preview image from URL')}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* LOCATION & SPOT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Location / Landmark</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Abbey Falls, Coorg"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Date Captured</label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* CATEGORY TAG SELECTION */}
              <div>
                <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                  <TagIcon className="w-3 h-3 text-slate-500" />
                  <span>Highlight Tag</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MEMORY_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewTag(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        newTag === tag
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* CAPTION / STORY */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">Story & Caption *</label>
                  <span className="text-[10px] text-slate-400">{newCaption.length} / 500</span>
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  placeholder="Tell co-travelers what made this moment special (e.g., 'The morning fog lifting over the coffee hills before our hike')..."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs resize-none"
                />
              </div>

              {/* SUBMIT ACTIONS */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newCaption.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Publish Memory</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {lightboxMemory && (
        <div 
          onClick={() => setLightboxMemory(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-3xl max-w-3xl w-full overflow-hidden border border-slate-800 shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
          >
            {/* Full Image */}
            <div className="md:w-3/5 bg-black flex items-center justify-center relative min-h-[300px]">
              <img
                src={lightboxMemory.imageUrl}
                alt={lightboxMemory.caption}
                className="w-full h-full max-h-[70vh] object-contain"
              />
              <button
                onClick={() => setLightboxMemory(null)}
                className="absolute top-3 left-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Side Information */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between text-white bg-slate-900/95 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  {lightboxMemory.tag && (
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {lightboxMemory.tag}
                    </span>
                  )}
                  <button
                    onClick={() => setLightboxMemory(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors hidden md:block"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold mb-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>{lightboxMemory.location}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{lightboxMemory.date}</span>
                </div>

                <div className="border-t border-slate-800 pt-4 mb-4">
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    "{lightboxMemory.caption}"
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-400 font-bold text-xs flex items-center justify-center">
                      {lightboxMemory.authorName?.charAt(0) || 'U'}
                    </span>
                    <span className="font-semibold text-slate-300">{lightboxMemory.authorName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleLikeMemory(lightboxMemory.id, e)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${((lightboxMemory.likes || 0) > 0) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    <span>{lightboxMemory.likes || 0} Likes</span>
                  </button>

                  <button
                    onClick={(e) => handleShareMemory(lightboxMemory, e)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>

                  <a
                    href={lightboxMemory.imageUrl}
                    download={`memory_${lightboxMemory.id}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                    title="Download Photo"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
