'use client';

import Image from 'next/image';
import { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
    restaurantId: string;
    onUploadComplete?: (photos: Array<{ id: string; url: string }>) => void;
}

interface SelectedFile {
    file: File;
    preview: string;
    status: 'pending' | 'uploading' | 'done' | 'error';
}

export function PhotoUpload({ restaurantId, onUploadComplete }: PhotoUploadProps) {
    const [files, setFiles] = useState<SelectedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
        if (!selectedFiles) return;

        console.log(`[PhotoUpload] Selected ${selectedFiles.length} files`);
        const newFiles: SelectedFile[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            console.log(`[PhotoUpload] File: ${file.name}, type: ${file.type}`);

            // Validate file type
            if (!file.type.startsWith('image/')) {
                console.warn(`[PhotoUpload] Skipping non-image: ${file.name}`);
                continue;
            }

            // Create preview
            const preview = URL.createObjectURL(file);
            newFiles.push({ file, preview, status: 'pending' });
        }

        setFiles(prev => [...prev, ...newFiles]);
        setError(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        console.log('[PhotoUpload] Files dropped');
        handleFileSelect(e.dataTransfer.files);
    }, [handleFileSelect]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const removeFile = useCallback((index: number) => {
        setFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    }, []);

    const uploadPhotos = async () => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('restaurantId', restaurantId);

            files.forEach((f) => {
                formData.append('files', f.file);
            });

            // Mark all as uploading
            setFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

            const response = await fetch('/api/photos', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Upload failed');
                setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
                return;
            }

            // Mark all as done
            setFiles(prev => prev.map(f => ({ ...f, status: 'done' as const })));

            // Notify parent
            onUploadComplete?.(data.photos);

            // Clear files after short delay
            setTimeout(() => {
                files.forEach(f => URL.revokeObjectURL(f.preview));
                setFiles([]);
            }, 1500);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Drop Zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                    'rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-base',
                    'hover:border-primary-500/50 hover:bg-primary-50/50',
                    files.length > 0 ? 'border-primary-300' : 'border-muted-foreground/20'
                )}
            >
                <input
                    ref={fileInputRef}
                    data-testid="file-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                />

                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <Upload size={24} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">
                    Drop photos here or tap to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Supports JPG, PNG, HEIC
                </p>
            </div>

            {/* Preview Grid */}
            {files.length > 0 && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                        {files.map((f, index) => (
                            <div
                                key={index}
                                className="relative aspect-square rounded-xl overflow-hidden bg-muted"
                            >
                                <Image
                                    src={f.preview}
                                    alt={`Preview ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />

                                {/* Status Overlay */}
                                {f.status !== 'pending' && (
                                    <div className={cn(
                                        'absolute inset-0 flex items-center justify-center',
                                        f.status === 'uploading' && 'bg-black/50',
                                        f.status === 'done' && 'bg-green-500/50',
                                        f.status === 'error' && 'bg-red-500/50'
                                    )}>
                                        {f.status === 'uploading' && (
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        )}
                                        {f.status === 'done' && (
                                            <Check size={24} className="text-white" />
                                        )}
                                        {f.status === 'error' && (
                                            <X size={24} className="text-white" />
                                        )}
                                    </div>
                                )}

                                {/* Remove Button */}
                                {f.status === 'pending' && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(index);
                                        }}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-base"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={uploadPhotos}
                        disabled={isUploading || files.every(f => f.status === 'done')}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-xl disabled:opacity-50 transition-base flex items-center justify-center gap-2"
                    >
                        {isUploading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Uploading {files.length} photo{files.length > 1 ? 's' : ''}...
                            </>
                        ) : files.every(f => f.status === 'done') ? (
                            <>
                                <Check size={18} />
                                Uploaded!
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Upload {files.length} photo{files.length > 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-100 text-red-700 rounded-xl p-3 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
