'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [imageQuality, setImageQuality] = useState<any>(null);
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
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Place a high-quality reference sample in the inspection area</li>
            <li>Ensure proper lighting and alignment</li>
            <li>Capture the image using the settings from Step 1</li>
            <li>Verify image quality metrics</li>
            <li>Register the image as the master reference</li>
          </ol>
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCapture}
              disabled={isCapturing || isRegistering}
              size="lg"
              className="flex-1"
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
                  Capture Image
                </>
              )}
            </Button>

            <Button
              onClick={handleRegister}
              disabled={!capturedImage || masterImageRegistered || isRegistering}
              size="lg"
              className="flex-1"
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
                  Register Master
                </>
              )}
            </Button>
          </div>

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

