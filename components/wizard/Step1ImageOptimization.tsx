'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { OptimizationResult } from '@/types';

interface Step1Props {
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  setBrightnessMode: (mode: 'normal' | 'hdr' | 'highgain') => void;
  focusValue: number[];
  setFocusValue: (value: number[]) => void;
}

export default function Step1ImageOptimization({
  brightnessMode,
  setBrightnessMode,
  focusValue,
  setFocusValue,
}: Step1Props) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  const handleAutoOptimize = async () => {
    setIsOptimizing(true);
    
    try {
      const result: OptimizationResult = await api.autoOptimize();
      
      // Apply optimized settings
      setBrightnessMode(result.optimalBrightness);
      setFocusValue([result.optimalFocus]);
      
      toast({
        title: "Optimization Complete!",
        description: `Optimal settings applied: ${result.optimalBrightness} brightness, ${result.optimalFocus}% focus`,
      });
    } catch (error) {
      console.error('Auto-optimization failed:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Please try again or adjust settings manually",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Step 1: Image Optimization</h2>
        <p className="text-muted-foreground mt-2">
          Optimize camera settings for best image quality
        </p>
      </div>

      {/* Brightness Mode Card */}
      <Card>
        <CardHeader>
          <CardTitle>Brightness Mode</CardTitle>
          <CardDescription>
            Select camera exposure mode based on lighting conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup 
            value={brightnessMode} 
            onValueChange={(value) => setBrightnessMode(value as any)}
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="normal" id="normal" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="normal" className="text-base font-medium cursor-pointer">
                  Normal
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Standard exposure for well-lit environments
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="hdr" id="hdr" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="hdr" className="text-base font-medium cursor-pointer">
                  HDR (High Dynamic Range)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Better contrast for mixed lighting conditions
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
              <RadioGroupItem value="highgain" id="highgain" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="highgain" className="text-base font-medium cursor-pointer">
                  High Gain (Low Light)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Increased sensitivity for dim environments
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Focus Adjustment Card */}
      <Card>
        <CardHeader>
          <CardTitle>Focus Adjustment</CardTitle>
          <CardDescription>
            Fine-tune camera focus for optimal image sharpness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">Focus Value</Label>
              <span className="text-2xl font-bold text-primary">{focusValue[0]}%</span>
            </div>
            <Slider
              value={focusValue}
              onValueChange={setFocusValue}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Infinity (0%)</span>
              <span>Close focus (100%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Optimize Button */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-2">Automatic Optimization</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Let the system automatically find the optimal brightness and focus settings for your lighting conditions. 
                This process takes approximately 10-15 seconds.
              </p>
            </div>
          </div>
          
          <Button
            onClick={handleAutoOptimize}
            disabled={isOptimizing}
            size="lg"
            className="w-full"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Optimizing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Auto-Optimize Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

