
"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UploadCloud, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import imageCompression from 'browser-image-compression';
import Image from 'next/image';

interface ReceiptUploadProps {
  onUploadComplete: (url: string | null) => void;
  userId: string;
}

export function ReceiptUpload({ onUploadComplete, userId }: ReceiptUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedSize, setCompressedSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state for new upload
    resetState();

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };

    setIsUploading(true);

    try {
      if (!storage) {
          throw new Error("Firebase Storage is not configured. Please check your environment variables.");
      }
      console.log(`Original file size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      const compressedFile = await imageCompression(file, options);
      console.log(`Compressed file size: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
      setCompressedSize(`${(compressedFile.size / 1024).toFixed(1)} KB`);
      setPreviewUrl(URL.createObjectURL(compressedFile));

      // Unique file name for the receipt
      const storageRef = ref(storage, `receipts/${userId}/${Date.now()}-${compressedFile.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error('Upload failed:', error);
          toast({ title: 'Upload Failed', description: 'Could not upload the receipt image. Check storage rules in Firebase.', variant: 'destructive' });
          resetState();
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUploadComplete(downloadURL);
          setIsUploading(false);
          toast({ title: 'Upload Complete', description: 'Receipt image successfully attached.' });
        }
      );
    } catch (error: any) {
      console.error('Compression or upload error:', error);
      toast({ title: 'Error', description: error.message || 'Could not process the image.', variant: 'destructive' });
      resetState();
    }
  };

  const resetState = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setPreviewUrl(null);
    setCompressedSize(null);
    onUploadComplete(null);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Input
        id="receipt-file"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        <UploadCloud className="mr-2 h-4 w-4" />
        {previewUrl ? 'Change Receipt' : 'Upload Receipt'}
      </Button>

      {isUploading && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">Uploading... {Math.round(uploadProgress)}%</p>
        </div>
      )}

      {previewUrl && !isUploading && (
        <Alert variant="default" className="relative p-2">
            <div className="flex items-center gap-3">
                 <Image
                    src={previewUrl}
                    alt="Receipt preview"
                    width={48}
                    height={48}
                    className="rounded-md object-cover aspect-square"
                />
                <div className="flex-1">
                    <AlertDescription className="text-xs">
                        Upload complete.
                    </AlertDescription>
                    {compressedSize && (
                        <p className="text-xs font-mono text-muted-foreground">Size: {compressedSize}</p>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetState}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        </Alert>
      )}
    </div>
  );
}
