'use client';

import { useState, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { FILE_LIMITS } from '@pob-eqp/shared';

interface UploadedFile {
  fileKey: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  documentType: string;
}

interface DocumentUploaderProps {
  documentType: string;
  label: string;
  description?: string;
  accept?: string;
  required?: boolean;
  onUploaded: (file: UploadedFile) => void;
  onRemove?: (fileKey: string) => void;
  maxFiles?: number;
}

const MAX_SIZE = FILE_LIMITS.MAX_SIZE_BYTES; // 10 MB
const ACCEPTED = '.pdf,.jpg,.jpeg,.png';

export function DocumentUploader({
  documentType,
  label,
  description,
  accept = ACCEPTED,
  required = false,
  onUploaded,
  onRemove,
  maxFiles = 1,
}: DocumentUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError(`File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)} MB.`);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png'];
    if (!ext || !allowedExts.includes(ext)) {
      setError('Only PDF, JPG, and PNG files are accepted.');
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      // Upload via multipart POST — single step, no S3 needed
      const response = await new Promise<{ fileKey: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener('load', () => {
          if (xhr.status < 300) {
            try {
              const body = JSON.parse(xhr.responseText) as { data: { fileKey: string } };
              resolve(body.data);
            } catch {
              reject(new Error('Invalid server response'));
            }
          } else {
            try {
              const body = JSON.parse(xhr.responseText) as { message?: string };
              reject(new Error(body.message ?? `Upload failed: ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
        xhr.open('POST', `${baseUrl}/registration/documents/upload`);

        // Inject auth token
        const token = localStorage.getItem('accessToken');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        xhr.send(formData);
      });

      const uploaded: UploadedFile = {
        fileKey: response.fileKey,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type,
        documentType,
      };

      setFiles((prev) => [...prev, uploaded]);
      onUploaded(uploaded);
      setProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentType],
  );

  const handleRemove = (fileKey: string) => {
    setFiles((prev) => prev.filter((f) => f.fileKey !== fileKey));
    onRemove?.(fileKey);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs text-gray-400">PDF, JPG, PNG · max 10 MB</span>
      </div>

      {description && <p className="text-xs text-gray-500">{description}</p>}

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.fileKey}
              className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <span className="text-xl flex-shrink-0">
                {f.contentType === 'application/pdf' ? '📄' : '🖼️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{f.fileName}</p>
                <p className="text-xs text-gray-500">{formatSize(f.fileSize)}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(f.fileKey)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — shown if below maxFiles */}
      {files.length < maxFiles && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-pob-blue bg-blue-50'
              : uploading
                ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
                : 'border-gray-300 hover:border-pob-blue hover:bg-gray-50'
          }`}
        >
          {uploading ? (
            <div className="space-y-2">
              <div className="w-8 h-8 border-3 border-pob-blue border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-600">Uploading... {progress}%</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-pob-blue h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <span className="text-3xl block mb-2">📎</span>
              <p className="text-sm font-medium text-gray-700">
                Drop file here or <span className="text-pob-blue">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{accept.replace(/\./g, '').toUpperCase()}</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
