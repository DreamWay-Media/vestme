import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Loader2, Globe, Search, TrendingUp, Users, Target, Building, Zap } from "lucide-react";

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // in seconds
}

const ANALYSIS_STEPS: AnalysisStep[] = [
  {
    id: "website-crawl",
    title: "Website Analysis",
    description: "Analyzing your website content and extracting business information",
    icon: <Globe className="w-5 h-5" />,
    duration: 8
  },
  {
    id: "market-research",
    title: "Market Research",
    description: "Conducting comprehensive market analysis and competitor research",
    icon: <Search className="w-5 h-5" />,
    duration: 12
  },
  {
    id: "business-analysis",
    title: "Business Intelligence",
    description: "Generating detailed business insights and value propositions",
    icon: <TrendingUp className="w-5 h-5" />,
    duration: 10
  },
  {
    id: "target-analysis",
    title: "Target Market Analysis",
    description: "Identifying target demographics and market opportunities",
    icon: <Users className="w-5 h-5" />,
    duration: 8
  },
  {
    id: "competitive-advantage",
    title: "Competitive Analysis",
    description: "Analyzing competitive landscape and positioning strategies",
    icon: <Target className="w-5 h-5" />,
    duration: 10
  },
  {
    id: "business-model",
    title: "Business Model Analysis",
    description: "Evaluating revenue streams and business model viability",
    icon: <Building className="w-5 h-5" />,
    duration: 7
  },
  {
    id: "finalize",
    title: "Finalizing Results",
    description: "Compiling comprehensive business profile and recommendations",
    icon: <Zap className="w-5 h-5" />,
    duration: 5
  }
];

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  onComplete?: () => void;
}

export default function AnalysisProgress({ isAnalyzing, onComplete }: AnalysisProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const totalDuration = ANALYSIS_STEPS.reduce((acc, step) => acc + step.duration, 0);
  const elapsedTime = ANALYSIS_STEPS.slice(0, currentStepIndex).reduce((acc, step) => acc + step.duration, 0) + 
                     (stepProgress / 100) * ANALYSIS_STEPS[currentStepIndex]?.duration || 0;
  const overallProgress = Math.min((elapsedTime / totalDuration) * 100, 100);

  useEffect(() => {
    if (!isAnalyzing) {
      return;
    }

    const interval = setInterval(() => {
      const currentStep = ANALYSIS_STEPS[currentStepIndex];
      if (!currentStep) return;

      setStepProgress(prev => {
        const newProgress = prev + (100 / (currentStep.duration * 10)); // Update every 100ms
        
        if (newProgress >= 100) {
          setCompletedSteps(prevCompleted => [...prevCompleted, currentStep.id]);
          
          if (currentStepIndex < ANALYSIS_STEPS.length - 1) {
            setCurrentStepIndex(prevIndex => prevIndex + 1);
            return 0;
          } else {
            // Analysis complete
            setTimeout(() => {
              onComplete?.();
            }, 500);
            return 100;
          }
        }
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnalyzing, currentStepIndex, onComplete]);

  // Reset when analysis starts
  useEffect(() => {
    if (isAnalyzing) {
      setCurrentStepIndex(0);
      setStepProgress(0);
      setCompletedSteps([]);
    }
  }, [isAnalyzing]);

  if (!isAnalyzing) {
    return null;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          AI Business Analysis in Progress
        </CardTitle>
        <div className="space-y-2">
          <Progress value={overallProgress} className="w-full h-2" />
          <p className="text-sm text-muted-foreground">
            {Math.round(overallProgress)}% Complete • Estimated {Math.max(0, Math.round((totalDuration - elapsedTime)))} seconds remaining
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {ANALYSIS_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all duration-200 ${
                isCurrent 
                  ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950" 
                  : isCompleted
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                  : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
              }`}
            >
              <div className={`flex-shrink-0 ${
                isCompleted 
                  ? "text-green-600 dark:text-green-400" 
                  : isCurrent 
                  ? "text-blue-600 dark:text-blue-400" 
                  : "text-gray-400 dark:text-gray-600"
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className={`font-medium ${
                  isCompleted 
                    ? "text-green-900 dark:text-green-100" 
                    : isCurrent 
                    ? "text-blue-900 dark:text-blue-100" 
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm mt-1 ${
                  isCompleted 
                    ? "text-green-700 dark:text-green-300" 
                    : isCurrent 
                    ? "text-blue-700 dark:text-blue-300" 
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                  {step.description}
                </p>
                
                {isCurrent && (
                  <div className="mt-2">
                    <Progress 
                      value={stepProgress} 
                      className="w-full h-1.5"
                    />
                  </div>
                )}
              </div>
              
              <div className={`text-xs px-2 py-1 rounded ${
                isCompleted 
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                  : isCurrent 
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {isCompleted ? "Complete" : isCurrent ? "Processing" : "Pending"}
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                Powered by Advanced AI
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Our AI is analyzing your business using GPT-4o with comprehensive market research, 
                competitor analysis, and strategic insights to create a detailed business profile.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}