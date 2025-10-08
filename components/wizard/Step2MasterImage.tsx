'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, AlertTriangle, Loader2, Upload, FileImage } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { CapturedImage } from '@/types';

interface Step2Props {
  masterImageRegistered: boolean;
  setMasterImageRegistered: (registered: boolean) => void;
  masterImagePath: string | null;
  setMasterImagePath: (path: string | null) => void;
  masterImageData: string | null;
  setMasterImageData: (data: string | null) => void;
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  focusValue: number;
}

export default function Step2MasterImage({
  masterImageRegistered,
  setMasterImageRegistered,
  masterImagePath,
  setMasterImagePath,
  masterImageData,
  setMasterImageData,
  brightnessMode,
  focusValue,
}: Step2Props) {
  const [capturedImage, setCapturedImage] = useState<string | null>(masterImageData);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageQuality, setImageQuality] = useState<any>(null);
  const [imageSource, setImageSource] = useState<'camera' | 'upload' | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update captured image when masterImageData changes
  useEffect(() => {
    if (masterImageData) {
      setCapturedImage(masterImageData);
    }
  }, [masterImageData]);

  const handleCapture = async () => {
    setIsCapturing(true);
    
    try {
      const result: CapturedImage = await api.captureImage({
        brightnessMode,
        focusValue,
      });
      
      setCapturedImage(result.image);
      setMasterImageData(result.image);
      setImageQuality(result.quality);
      setImageSource('camera');
      setUploadedFileName(null);
      
      // Check quality and warn if low
      if (result.quality.score < 70) {
        toast({
          title: "Image Quality Warning",
          description: "Image quality is below recommended threshold. Consider adjusting camera settings.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Image Captured",
          description: `Quality score: ${result.quality.score.toFixed(1)}/100`,
        });
      }
    } catch (error) {
      console.error('Capture failed:', error);
      toast({
        title: "Capture Failed",
        description: error instanceof Error ? error.message : "Please check camera connection and try again",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPEG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64Data = result.split(',')[1];
        
        setCapturedImage(base64Data);
        setMasterImageData(base64Data);
        setImageSource('upload');
        setUploadedFileName(file.name);
        setImageQuality(null); // Uploaded images don't have quality metrics
        
        toast({
          title: "Image Loaded",
          description: `Successfully loaded ${file.name}`,
        });
      };

      reader.onerror = () => {
        toast({
          title: "Load Failed",
          description: "Failed to read image file",
          variant: "destructive",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to load image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleRegister = async () => {
    if (!capturedImage) {
      toast({
        title: "No Image",
        description: "Please capture an image first",
        variant: "destructive",
      });
      return;
    }

    setIsRegistering(true);
    
    try {
      // Convert base64 to blob
      const byteString = atob(capturedImage);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/jpeg' });
      const file = new File([blob], 'master_image.jpg', { type: 'image/jpeg' });
      
      // Upload to temp program (will be saved properly when program is created)
      // For now, just mark as registered
      setMasterImagePath(capturedImage); // Store base64 as path temporarily
      setMasterImageRegistered(true);
      
      toast({
        title: "Master Image Registered",
        description: "Reference image saved successfully",
      });
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Failed to register master image",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Step 2: Master Image Registration</h2>
        <p className="text-muted-foreground mt-2">
          Capture and register a high-quality reference image
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Option 1: Capture from Camera
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
                <li>Place a high-quality reference sample in the inspection area</li>
                <li>Ensure proper lighting and alignment</li>
                <li>Capture the image using the settings from Step 1</li>
                <li>Verify image quality metrics</li>
              </ol>
            </div>
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                Option 2: Load from Computer
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm ml-6">
                <li>Click "Load from Computer" button</li>
                <li>Select a high-quality reference image (JPEG, PNG, etc.)</li>
                <li>Preview the loaded image</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2 ml-6">
                * Maximum file size: 10MB | Supported formats: JPEG, PNG, BMP, TIFF
              </p>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-semibold">
                5. Register the image as the master reference
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Display Card */}
      <Card>
        <CardHeader>
          <CardTitle>Captured Image</CardTitle>
          <CardDescription>
            Current camera view with applied settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Display */}
          <div className="border-2 border-dashed rounded-lg p-4 bg-muted/20 min-h-[480px] flex items-center justify-center overflow-hidden">
            {capturedImage ? (
              <img
                src={`data:image/jpeg;base64,${capturedImage}`}
                alt="Captured master image"
                className="max-w-full max-h-[480px] object-contain rounded"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No image captured yet</p>
                <p className="text-sm mt-2">Click "Capture Image" to get started</p>
              </div>
            )}
          </div>

          {/* Quality Metrics */}
          {imageQuality && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-accent/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Brightness</p>
                <p className="text-lg font-bold">{imageQuality.brightness.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Sharpness</p>
                <p className="text-lg font-bold">{imageQuality.sharpness.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Exposure</p>
                <p className="text-lg font-bold">{imageQuality.exposure.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                <p className={`text-lg font-bold ${getQualityColor(imageQuality.score)}`}>
                  {imageQuality.score.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* Image Source Info */}
          {imageSource && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
              {imageSource === 'camera' ? (
                <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              ) : (
                <FileImage className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
              <span className="text-blue-900 dark:text-blue-100">
                {imageSource === 'camera' 
                  ? 'Image captured from camera' 
                  : `Image loaded from: ${uploadedFileName}`}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleCapture}
              disabled={isCapturing || isRegistering || isUploading}
              size="lg"
              variant="default"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Capturing...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </>
              )}
            </Button>

            <Button
              onClick={handleFileSelect}
              disabled={isCapturing || isRegistering || isUploading}
              size="lg"
              variant="outline"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Load File
                </>
              )}
            </Button>

            <Button
              onClick={handleRegister}
              disabled={!capturedImage || masterImageRegistered || isRegistering}
              size="lg"
              variant={masterImageRegistered ? "secondary" : "default"}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : masterImageRegistered ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Registered
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Register
                </>
              )}
            </Button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Registration Status */}
          {masterImageRegistered && (
            <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900 dark:text-green-100">
                  Master image successfully registered!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  You can now proceed to configure inspection tools
                </p>
              </div>
            </div>
          )}

          {/* Quality Warning */}
          {imageQuality && imageQuality.score < 70 && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  Low image quality detected
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Consider adjusting brightness or focus settings for better results
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Settings Card */}
      <Card className="bg-accent/30">
        <CardHeader>
          <CardTitle className="text-base">Current Camera Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Badge variant="outline" className="text-sm">
            Brightness: {brightnessMode}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Focus: {focusValue}%
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

