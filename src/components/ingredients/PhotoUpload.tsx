'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';

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
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-olive-500 bg-olive-50' : 'border-cream-300 hover:border-olive-400 hover:bg-cream-50'}`}
      >
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <HiOutlinePhotograph className="w-10 h-10 text-[#a89f94] mx-auto mb-3" />
        <p className="text-sm font-medium text-[#7a7568]">
          {isExtracting ? <span className="animate-pulse-soft text-olive-600">Analyzing photos...</span> : 'Drop food photos here or click to browse'}
        </p>
        <p className="text-xs text-[#a89f94] mt-1">Supports JPG, PNG. Multiple photos allowed.</p>
      </div>
      {photos.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {photos.map((photo) => (
            <div key={photo.id} className="relative w-20 h-20 rounded-xl overflow-hidden group ring-1 ring-cream-300">
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
