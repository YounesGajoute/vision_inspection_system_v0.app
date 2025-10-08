'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// Import wizard steps
import Step1ImageOptimization from '@/components/wizard/Step1ImageOptimization';
import Step2MasterImage from '@/components/wizard/Step2MasterImage';
import Step3ToolConfiguration from '@/components/wizard/Step3ToolConfiguration';
import Step4OutputAssignment from '@/components/wizard/Step4OutputAssignment';

import type { ProgramConfig, ToolConfig, OutputAssignment, OutputCondition } from '@/types';

export default function ConfigurePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Image Optimization
  const [triggerType, setTriggerType] = useState<'internal' | 'external'>('internal');
  const [triggerInterval, setTriggerInterval] = useState('1000');
  const [externalDelay, setExternalDelay] = useState('0');
  const [brightnessMode, setBrightnessMode] = useState<'normal' | 'hdr' | 'highgain'>('normal');
  const [focusValue, setFocusValue] = useState([50]);
  
  // Step 2: Master Image
  const [masterImageRegistered, setMasterImageRegistered] = useState(false);
  const [masterImagePath, setMasterImagePath] = useState<string | null>(null);
  const [masterImageData, setMasterImageData] = useState<string | null>(null);
  
  // Step 3: Tool Configuration
  const [configuredTools, setConfiguredTools] = useState<ToolConfig[]>([]);
  
  // Step 4: Output Assignment
  const [programName, setProgramName] = useState('');
  const [outputAssignments, setOutputAssignments] = useState<OutputAssignment>({
    OUT1: 'Always ON',  // BUSY
    OUT2: 'OK',         // OK signal
    OUT3: 'NG',         // NG signal
    OUT4: 'Not Used',
    OUT5: 'Not Used',
    OUT6: 'Not Used',
    OUT7: 'Not Used',
    OUT8: 'Not Used',
  });

  const steps = [
    { number: 1, title: 'Image Optimization', description: 'Configure trigger and camera settings' },
    { number: 2, title: 'Master Image', description: 'Capture reference image' },
    { number: 3, title: 'Tool Configuration', description: 'Define inspection tools' },
    { number: 4, title: 'Output Assignment', description: 'Configure outputs and save' },
  ];

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        // Validate trigger settings
        if (triggerType === 'internal') {
          const interval = parseInt(triggerInterval);
          return interval >= 1 && interval <= 10000;
        } else {
          const delay = parseInt(externalDelay);
          return delay >= 0 && delay <= 1000;
        }
      case 2:
        return masterImageRegistered;
      case 3:
        return configuredTools.length > 0;
      case 4:
        return false; // Last step, no next button
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    try {
      // Build program configuration
      const config: ProgramConfig = {
        triggerType,
        triggerInterval: triggerType === 'internal' ? parseInt(triggerInterval) : undefined,
        triggerDelay: triggerType === 'external' ? parseInt(externalDelay) : undefined,
        brightnessMode,
        focusValue: focusValue[0],
        masterImage: masterImagePath,
        tools: configuredTools,
        outputs: outputAssignments,
      };

      // Create program
      const result = await api.createProgram(programName, config);

      toast({
        title: "Success!",
        description: `Program "${programName}" created successfully`,
      });

      // Redirect to home
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (error) {
      throw error; // Let Step4 handle the error display
    }
  };

  const progress = (currentStep / 4) * 100;

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Configuration Wizard</h1>
        <p className="text-muted-foreground">
          Create a new inspection program by following these 4 steps
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="p-6 mb-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">
              Step {currentStep} of 4
            </span>
            <span className="text-sm text-muted-foreground">
              {steps[currentStep - 1].title}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          {/* Step Indicators */}
          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`text-center ${
                  step.number === currentStep
                    ? 'text-primary font-semibold'
                    : step.number < currentStep
                    ? 'text-green-600'
                    : 'text-muted-foreground'
                }`}
              >
                <div className="text-xs">{step.title}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <div className="mb-8">
        {currentStep === 1 && (
          <Step1ImageOptimization
            triggerType={triggerType}
            setTriggerType={setTriggerType}
            triggerInterval={triggerInterval}
            setTriggerInterval={setTriggerInterval}
            externalDelay={externalDelay}
            setExternalDelay={setExternalDelay}
            brightnessMode={brightnessMode}
            setBrightnessMode={setBrightnessMode}
            focusValue={focusValue}
            setFocusValue={setFocusValue}
          />
        )}

        {currentStep === 2 && (
          <Step2MasterImage
            masterImageRegistered={masterImageRegistered}
            setMasterImageRegistered={setMasterImageRegistered}
            masterImagePath={masterImagePath}
            setMasterImagePath={setMasterImagePath}
            masterImageData={masterImageData}
            setMasterImageData={setMasterImageData}
            brightnessMode={brightnessMode}
            focusValue={focusValue[0]}
          />
        )}

        {currentStep === 3 && (
          <Step3ToolConfiguration
            configuredTools={configuredTools}
            setConfiguredTools={setConfiguredTools}
            masterImageData={masterImageData}
          />
        )}

        {currentStep === 4 && (
          <Step4OutputAssignment
            programName={programName}
            setProgramName={setProgramName}
            outputAssignments={outputAssignments}
            setOutputAssignments={setOutputAssignments}
            triggerType={triggerType}
            brightnessMode={brightnessMode}
            focusValue={focusValue[0]}
            masterImageRegistered={masterImageRegistered}
            toolCount={configuredTools.length}
            onSave={handleSave}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <Card className="p-6">
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < 4 && (
            <Button
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
