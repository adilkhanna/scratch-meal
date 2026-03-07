'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { HiOutlineX } from 'react-icons/hi';

interface PhotoPreview { id: string; url: string; file: File; }
interface Props { onExtract: (base64: string) => Promise<void>; isExtracting: boolean; }

export default function PhotoUpload({ onExtract, isExtracting }: Props) {
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const newPhotos: PhotoPreview[] = fileArray.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, url: URL.createObjectURL(file), file,
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    for (const photo of newPhotos) {
      const base64 = await fileToBase64(photo.file);
      await onExtract(base64);
    }
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const result = reader.result as string; resolve(result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFiles(e.target.files); e.target.value = ''; };
  const handleDrop = (e: DragEvent) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); };
  const removePhoto = (id: string) => {
    setPhotos((prev) => { const photo = prev.find((p) => p.id === id); if (photo) URL.revokeObjectURL(photo.url); return prev.filter((p) => p.id !== id); });
  };

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`glass-panel p-10 text-center cursor-pointer transition-all ${dragOver ? 'border-white/60 bg-white/25' : 'hover:bg-white/25'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <p className="text-[14px] font-[family-name:var(--font-mono-option)] tracking-[1px] uppercase text-black">
          {isExtracting ? <span className="animate-pulse-soft">ANALYZING PHOTOS...</span> : 'UPLOAD IMAGES OF INGREDIENTS HERE FOR US TO ANALYZE'}
        </p>
      </div>
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((photo) => (
            <div key={photo.id} className="relative w-20 h-20 rounded-xl overflow-hidden group ring-1 ring-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="Food" className="w-full h-full object-cover" />
              <button onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <HiOutlineX className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
