"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { JAILBREAK_CATEGORIES, JailbreakCategory, getCategoryStats } from "@/lib/categorizer";
import { evaluateDataset, getPerformanceSummary } from "@/lib/evaluation";
import ModelComparisonTable from "@/components/ModelComparisonTable";
import CategoryPerformanceChart from "@/components/CategoryPerformanceChart";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

type Row = {
  custom_id: string;
  question: string;
  llm_response: string;
  response_content: string;
  final_score: number;
  average_score: number;
  score_0_25: number;
  asr_0_25: number;
  score_1: number;
  asr_1: number;
  category?: JailbreakCategory;
};

function AnimatedProgress({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <Progress
      value={animatedValue}
      className={`transition-all duration-1000 ease-out ${className}`}
    />
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<Row[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [categoryStats, setCategoryStats] = useState<ReturnType<typeof getCategoryStats>>([]);
  const [evaluationResults, setEvaluationResults] = useState<any[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState('GPT-4');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<'custom_id' | 'question' | 'category' | 'final_score'>('final_score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Landing page steps
  const [currentStep, setCurrentStep] = useState(0);
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isApiConfigured, setIsApiConfigured] = useState(false);

  // Step navigation functions
  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApiSubmit = () => {
    if (apiEndpoint && apiKey) {
      setIsApiConfigured(true);
      // Here you would typically validate the API credentials
      // For now, we'll just proceed to the main dashboard
    }
  };

  // 정렬 함수
  const handleSort = (field: 'custom_id' | 'question' | 'category' | 'final_score') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // 정렬 및 필터링된 데이터
  const filteredAndSortedData = data
    .filter(row => 
      searchKeyword === '' || 
      row.question.toLowerCase().includes(searchKeyword.toLowerCase())
    )
    .sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'custom_id':
          aVal = a.custom_id;
          bVal = b.custom_id;
          break;
        case 'question':
          aVal = a.question.toLowerCase();
          bVal = b.question.toLowerCase();
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'final_score':
        default:
          aVal = a.final_score;
          bVal = b.final_score;
          break;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

  useEffect(() => {
    async function loadAndCategorizeData() {
      try {
        const res = await fetch("/data/converted_dataset.json");
        const rows: Row[] = await res.json();
        
        setCategorizing(true);
        
        const prompts = rows.map(row => row.question);
        const categorizeRes = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompts })
        });
        
        if (categorizeRes.ok) {
          const { categorizedPrompts } = await categorizeRes.json();
          const categorizedRows = rows.map((row, index) => ({
            ...row,
            category: categorizedPrompts[index]?.category
          }));
          
          setData(categorizedRows);
          setCategoryStats(getCategoryStats(categorizedRows));
          
          // Evaluate dataset and generate comparison data
          const evalResults = evaluateDataset(categorizedRows);
          const perfSummary = getPerformanceSummary(evalResults);
          setEvaluationResults(evalResults);
          setPerformanceSummary(perfSummary);
        } else {
          setData(rows);
        }
        
        setCategorizing(false);
        
        setTimeout(() => {
          setIsLoaded(true);
        }, 100);
      } catch (error) {
        console.error('Error loading data:', error);
        setCategorizing(false);
      }
    }

    loadAndCategorizeData();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/asset/bg.png')"
        }}
      ></div>
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10 p-6">
        {!isApiConfigured ? (
          <>
            {/* Step indicator */}
            <div className="flex justify-center mb-12">
              <div className="flex items-center space-x-8">
                {['Welcome', 'Pipeline', 'API Configuration'].map((label, index) => (
                  <div key={index} className={`text-center transition-all duration-500 ${
                    index === currentStep ? 'text-red-500 font-bold text-lg' : 'text-white/60 text-base'
                  }`} style={{ color: index === currentStep ? '#FF0000' : undefined }}>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="min-h-[700px] flex items-center justify-center">
              {/* Step 0: Welcome with Logo */}
              {currentStep === 0 && (
                <div className="w-full h-full relative">
                  {/* Background Image */}
                  <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
                    style={{
                      backgroundImage: "url('/asset/bg.png')"
                    }}
                  ></div>
                  
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-8 py-20">
                    {/* Logo */}
                    <div>
                      <img 
                        src="/asset/logo.png" 
                        alt="Logo" 
                        className="max-w-4xl max-h-48 object-contain"
                      />
                    </div>
                    
                    {/* Welcome Message */}
                    <div className="space-y-4 mb-10">
                      <h1 className="text-4xl font-black text-white">
                        Welcome to AI Security Testing
                      </h1>
                      <p className="text-white/80 text-xl max-w-2xl">
                        Advanced jailbreak detection and vulnerability assessment platform
                      </p>
                    </div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="absolute bottom-6 left-0 right-0 z-10 flex justify-center">
                    <button
                      onClick={nextStep}
                      className="text-white px-10 py-6 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-3 text-lg group"
                    >
                      <span className="group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all duration-300">
                        Get Started
                      </span>

                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 1: Pipeline Images */}
              {currentStep === 1 && (
                <div className="w-full h-full relative">
                  {/* Content */}
                  <div className="relative z-10 flex flex-col items-center justify-center space-y-8 py-8">
                    {/* Images */}
                    <div className="space-y-5">
                      <div className="flex justify-center">
                        <img 
                          src="/asset/pip1.png" 
                          alt="Pipeline 1" 
                          className="max-w-4xl w-full object-contain"
                        />
                      </div>
                      <div className="flex justify-center">
                        <img 
                          src="/asset/pip2.png" 
                          alt="Pipeline 2" 
                          className="max-w-4xl w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-8 z-10 pointer-events-none">
                    <button
                      onClick={prevStep}
                      className="text-white text-3xl font-bold hover:text-gray-300 transition-all duration-300 pointer-events-auto"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={nextStep}
                      className="text-white text-3xl font-bold hover:text-gray-300 transition-all duration-300 pointer-events-auto"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 2: API Configuration */}
              {currentStep === 2 && (
                <div className="w-full h-full relative">
                  {/* Content */}
                  <div className="relative z-10 p-8 max-w-4xl mx-auto">
                    <div className="space-y-8 max-w-2xl mx-auto">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-white font-semibold mb-3 text-xl">API Endpoint</label>
                          <input
                            type="url"
                            placeholder="https://api.openai.com/v1/chat/completions"
                            value={apiEndpoint}
                            onChange={(e) => setApiEndpoint(e.target.value)}
                            className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 text-lg"
                          />
                          <p className="text-white/60 text-sm mt-2">Enter your model's API endpoint URL</p>
                        </div>
                        
                        <div>
                          <label className="block text-white font-semibold mb-3 text-xl">API Key</label>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full px-6 py-4 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300 text-lg"
                          />
                          <p className="text-white/60 text-sm mt-2">Your API key will be used to test the model</p>
                        </div>
                      </div>
                      
                      <div className="bg-red-500/20 border border-red-400/30 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-lg">
                          <span>🛡️</span>
                          Security Notice
                        </h3>
                        <p className="text-white/80 text-base leading-relaxed">
                          Your API credentials are processed securely and used only for testing purposes. 
                          We recommend using a dedicated API key with limited permissions for testing.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-8 z-10 pointer-events-none">
                    <button
                      onClick={prevStep}
                      className="text-white text-3xl font-bold hover:text-gray-300 transition-all duration-300 pointer-events-auto"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={handleApiSubmit}
                      disabled={!apiEndpoint || !apiKey}
                      className={`text-3xl font-bold transition-all duration-300 pointer-events-auto ${
                        apiEndpoint && apiKey
                          ? 'text-white hover:text-gray-300'
                          : 'text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              )}
                    </div>
          </>
        ) : (
          // Main dashboard after API configuration
          <div className="w-full space-y-8 relative z-10 p-8">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black text-white mb-4">
                🎉 Ready to Test!
              </h1>
              <p className="text-white/80 text-xl">API configured successfully. You can now test your model against jailbreak prompts.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-3">API Endpoint</h3>
                <p className="text-gray-300 font-mono text-sm bg-black/30 p-3 rounded">{apiEndpoint}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-3">Status</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-300 font-semibold">Connected & Ready</span>
                </div>
              </div>
            </div>
            
            <div className="text-center">
              <button
                onClick={() => setIsApiConfigured(false)}
                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
              >
                Reconfigure API
              </button>
            </div>
            
            {/* Here you can add the full dashboard functionality */}
            <div className="text-center text-white/60 mt-16">
              <p className="text-lg">Full dashboard functionality will be implemented here...</p>
            </div>
          </div>
      )}
      </div>
    </div>
  );
}
