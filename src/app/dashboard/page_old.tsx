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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Advanced Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-cyan-400/30 to-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-pink-600/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-gradient-to-br from-orange-400/20 to-red-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-purple-400/60 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-emerald-400/60 rounded-full animate-bounce" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-2 h-2 bg-pink-400/60 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
      </div>
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')]"></div>
      
      <div className="relative z-10 p-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[0, 1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold transition-all duration-500 ${
                  step === currentStep 
                    ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30' 
                    : step < currentStep 
                    ? 'bg-green-500 border-green-400 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-400'
                }`}>
                  {step < currentStep ? '✓' : step + 1}
                </div>
                {step < 2 && (
                  <div className={`w-16 h-1 mx-2 rounded transition-all duration-500 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-600'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="min-h-[600px] flex items-center justify-center">
          {!isApiConfigured ? (
            <>
              {/* Step 0: Category Distribution */}
              {currentStep === 0 && (
                <div className="w-full max-w-6xl mx-auto">
                  <Card className="relative overflow-hidden bg-black/50 backdrop-blur-3xl border-2 border-cyan-500/30 shadow-2xl hover:shadow-cyan-500/20 hover:shadow-3xl transition-all duration-700 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full -translate-y-40 translate-x-40 group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-400/15 to-pink-600/15 rounded-full translate-y-32 -translate-x-32 group-hover:scale-125 transition-transform duration-1000 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    
                    {/* Neon border effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/30 via-blue-500/30 to-purple-600/30 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700"></div>
                    
                    <CardHeader className="relative z-10 pb-8 pt-8">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-3 mb-6">
                          <div className="p-3 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-2xl border border-cyan-400/50">
                            <span className="text-3xl">🎯</span>
                          </div>
                          <div>
                            <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-cyan-200 to-white bg-clip-text">
                              Category Distribution
                            </h1>
                            <p className="text-cyan-100/80 text-lg">Explore jailbreak attack patterns</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-6">
              <div className="relative group/icon">
                <div className="p-5 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-3xl backdrop-blur-sm border-2 border-cyan-400/40 shadow-2xl group-hover:scale-110 group/icon-hover:rotate-12 transition-all duration-500">
                  <div className="text-4xl filter drop-shadow-lg">🛡️</div>
                </div>
                <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/40 via-blue-500/40 to-purple-600/40 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/60 to-purple-600/60 rounded-3xl opacity-0 group/icon-hover:opacity-30 blur transition-opacity duration-300"></div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    Enterprise Security
                  </div>
                  <div className="px-3 py-1 bg-purple-500/20 border border-purple-400/30 rounded-full text-xs font-bold text-purple-300 uppercase tracking-wider">
                    AI Research
                  </div>
                </div>
                <CardTitle className="text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent drop-shadow-2xl">
                    Jailbreak Dataset
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
                    Analysis Platform
                  </span>
                </CardTitle>
                <p className="text-lg text-cyan-100/80 font-medium">
                  Advanced AI Security Research & Vulnerability Assessment
                </p>
              </div>
            </div>
            <div className="text-right space-y-3">
              <div className="bg-gradient-to-br from-cyan-500/30 to-blue-600/30 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-cyan-400/30 shadow-xl">
                <div className="text-3xl font-black text-transparent bg-gradient-to-r from-cyan-200 to-white bg-clip-text">537</div>
                <div className="text-sm text-cyan-300 font-semibold uppercase tracking-wide">Prompts</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/30 to-pink-600/30 backdrop-blur-sm rounded-2xl px-6 py-4 border-2 border-purple-400/30 shadow-xl">
                <div className="text-2xl font-black text-transparent bg-gradient-to-r from-purple-200 to-white bg-clip-text">{categoryStats.length}</div>
                <div className="text-xs text-purple-300 font-semibold uppercase tracking-wide">Categories</div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="group/card relative overflow-hidden bg-gradient-to-br from-cyan-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-cyan-400/30 hover:border-cyan-300/50 shadow-xl hover:shadow-cyan-500/20 transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/30 rounded-xl border border-cyan-400/40">
                    <span className="text-2xl filter drop-shadow-lg">📊</span>
                  </div>
                  <span className="text-lg font-bold text-cyan-200 tracking-wide">MHJ Dataset</span>
                </div>
                <p className="text-sm text-cyan-100/80 leading-relaxed">Multi-turn Jailbreak Analysis Framework</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-cyan-300 font-medium">Active Research</span>
                </div>
              </div>
            </div>
            
            <div className="group/card relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-600/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-purple-400/30 hover:border-purple-300/50 shadow-xl hover:shadow-purple-500/20 transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-pink-600/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/30 rounded-xl border border-purple-400/40">
                    <span className="text-2xl filter drop-shadow-lg">🤖</span>
                  </div>
                  <span className="text-lg font-bold text-purple-200 tracking-wide">AI Safety</span>
                </div>
                <p className="text-sm text-purple-100/80 leading-relaxed">Advanced Model Evaluation & Testing</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <span className="text-xs text-purple-300 font-medium">Research Grade</span>
                </div>
              </div>
            </div>
            
            <div className="group/card relative overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-600/20 backdrop-blur-xl rounded-2xl p-6 border-2 border-emerald-400/30 hover:border-emerald-300/50 shadow-xl hover:shadow-emerald-500/20 transition-all duration-500 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-teal-600/10 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/30 rounded-xl border border-emerald-400/40">
                    <span className="text-2xl filter drop-shadow-lg">🔍</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-200 tracking-wide">Security Analysis</span>
                </div>
                <p className="text-sm text-emerald-100/80 leading-relaxed">Comprehensive Vulnerability Assessment</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <span className="text-xs text-emerald-300 font-medium">Enterprise Level</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="dataset" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-black/40 backdrop-blur-2xl border-2 border-cyan-500/30 p-3 rounded-3xl shadow-2xl">
          <TabsTrigger 
            value="dataset" 
            className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:via-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:shadow-cyan-500/30 data-[state=active]:border-2 data-[state=active]:border-cyan-400/50 font-bold transition-all duration-700 rounded-2xl py-4 hover:bg-white/10 text-gray-300 hover:text-white group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center gap-3">
              <span className="text-2xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">📊</span>
              <span className="text-lg tracking-wide">Dataset Explorer</span>
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="results" 
            className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:via-pink-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-2xl data-[state=active]:shadow-purple-500/30 data-[state=active]:border-2 data-[state=active]:border-purple-400/50 font-bold transition-all duration-700 rounded-2xl py-4 hover:bg-white/10 text-gray-300 hover:text-white group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center gap-3">
              <span className="text-2xl filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300">📈</span>
              <span className="text-lg tracking-wide">Analysis Results</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dataset">
          {categorizing && (
            <div className="flex items-center justify-center py-8 mb-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Categorizing prompts...</p>
              </div>
            </div>
          )}
          
          {categoryStats.length > 0 && (
            <Card className="mb-10 bg-black/50 backdrop-blur-3xl border-2 border-cyan-500/30 shadow-2xl hover:shadow-cyan-500/20 hover:shadow-3xl transition-all duration-700 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-full -translate-y-40 translate-x-40 group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-400/15 to-pink-600/15 rounded-full translate-y-32 -translate-x-32 group-hover:scale-125 transition-transform duration-1000 animate-pulse" style={{ animationDelay: '1s' }}></div>
              
              {/* Neon border effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400/30 via-blue-500/30 to-purple-600/30 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700"></div>
              
              <CardHeader className="relative z-10 bg-gradient-to-r from-cyan-600/80 via-blue-600/80 to-purple-700/80 text-white backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="relative group/icon">
                      <div className="p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-3xl backdrop-blur-sm border-2 border-cyan-400/50 group-hover:scale-110 group/icon-hover:rotate-12 transition-all duration-500 shadow-2xl">
                        <span className="text-3xl filter drop-shadow-2xl">🎯</span>
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400/50 to-purple-400/50 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="px-3 py-1 bg-cyan-500/30 border border-cyan-400/40 rounded-full text-xs font-bold text-cyan-200 uppercase tracking-wider">
                          Data Visualization
                        </div>
                        <div className="px-3 py-1 bg-purple-500/30 border border-purple-400/40 rounded-full text-xs font-bold text-purple-200 uppercase tracking-wider">
                          Interactive
                        </div>
                      </div>
                      <CardTitle className="text-3xl font-black mb-3 tracking-tight">
                        <span className="bg-gradient-to-r from-cyan-200 via-white to-cyan-100 bg-clip-text text-transparent drop-shadow-2xl">
                          Category Distribution
                        </span>
                      </CardTitle>
                      <p className="text-cyan-100/80 text-base font-medium">
                        Interactive visualization of jailbreak attack patterns & methodologies
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="bg-gradient-to-br from-cyan-500/40 to-blue-600/40 backdrop-blur-sm rounded-2xl px-4 py-3 border-2 border-cyan-400/40 shadow-xl">
                      <div className="text-2xl font-black text-transparent bg-gradient-to-r from-cyan-200 to-white bg-clip-text">{categoryStats.length}</div>
                      <div className="text-xs text-cyan-300 font-semibold uppercase tracking-wide">Categories</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/40 to-pink-600/40 backdrop-blur-sm rounded-2xl px-4 py-3 border-2 border-purple-400/40 shadow-xl">
                      <div className="text-xl font-black text-transparent bg-gradient-to-r from-purple-200 to-white bg-clip-text">100%</div>
                      <div className="text-xs text-purple-300 font-semibold uppercase tracking-wide">Coverage</div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center">
                  <div className="h-96 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryStats.map(stat => ({
                            name: stat.category,
                            value: stat.count,
                            color: stat.color,
                            percentage: stat.percentage,
                            description: stat.description
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={140}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryStats.map((stat, index) => (
                            <Cell key={`cell-${index}`} fill={stat.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-lg">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: data.color }}
                                    />
                                    <span className="font-semibold text-sm">{data.name}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Category List */}
                  <div className="mt-8 max-h-80 overflow-y-auto bg-white/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
                    <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/20">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        Category Breakdown
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Detailed analysis of attack categories</p>
                    </div>
                    <div className="divide-y divide-white/10">
                      {categoryStats.map((stat, index) => (
                        <div key={index} className="flex items-start gap-4 p-5 hover:bg-gradient-to-r hover:from-blue-500/5 hover:to-purple-500/5 transition-all duration-500 group cursor-pointer">
                          <div className="relative">
                            <div 
                              className="w-6 h-6 rounded-full flex-shrink-0 mt-1 shadow-xl ring-4 ring-white/50 group-hover:scale-110 transition-transform duration-300"
                              style={{ backgroundColor: stat.color }}
                            />
                            <div 
                              className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm"
                              style={{ backgroundColor: stat.color }}
                            ></div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-bold text-base text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                                {stat.category}
                              </div>
                              <div className="bg-white/50 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                                <span className="text-xs font-bold text-gray-700">{stat.percentage.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="bg-blue-500/20 rounded-full px-2 py-1">
                                  <span className="text-xs font-semibold text-blue-700">{stat.count} prompts</span>
                                </div>
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-700 group-hover:shadow-lg"
                                    style={{ 
                                      backgroundColor: stat.color,
                                      width: `${stat.percentage}%`
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                              {stat.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <div className="text-lg font-semibold text-gray-700">
                      {data.length} Total Jailbreak Prompts
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Hover chart segments to see category names
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Jailbreak Prompts Table */}
          <Card className="bg-white/40 backdrop-blur-2xl border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-teal-500/5 to-blue-500/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-400/10 to-teal-600/10 rounded-full -translate-y-32 translate-x-32 group-hover:scale-110 transition-transform duration-700"></div>
            
            <CardHeader className="relative z-10 bg-gradient-to-r from-green-600/90 via-teal-600/90 to-blue-600/90 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-green-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold mb-2">
                      <span className="bg-gradient-to-r from-cyan-200 to-white bg-clip-text text-transparent">
                        Prompts Explorer
                      </span>
                    </CardTitle>
                    <p className="text-green-100 text-sm">
                      Search, sort, and analyze all jailbreak prompts in the dataset
                    </p>
                  </div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                  <div className="text-lg font-bold text-cyan-200">{filteredAndSortedData.length}</div>
                  <div className="text-xs text-green-200">Results</div>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔎 Search questions..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full px-6 py-4 pl-14 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/30 transition-all duration-300 text-lg"
                />
                <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white/70">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="max-h-96 overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl shadow-inner">
                <Table>
                  <TableHeader className="sticky top-0 bg-gradient-to-r from-gray-100 to-gray-200 z-10">
                    <TableRow className="border-b-2 border-gray-300">
                      <TableHead className="font-bold text-gray-700">📊 Rank</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-200 transition-all duration-300 font-bold text-gray-700"
                        onClick={() => handleSort('custom_id')}
                      >
                        🆔 ID {sortField === 'custom_id' && (
                          <span className="text-blue-600 font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-purple-200 transition-all duration-300 font-bold text-gray-700"
                        onClick={() => handleSort('category')}
                      >
                        🏷️ Category {sortField === 'category' && (
                          <span className="text-purple-600 font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-green-100 hover:to-green-200 transition-all duration-300 font-bold text-gray-700"
                        onClick={() => handleSort('question')}
                      >
                        ❓ Question {sortField === 'question' && (
                          <span className="text-green-600 font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gradient-to-r hover:from-red-100 hover:to-red-200 transition-all duration-300 font-bold text-gray-700"
                        onClick={() => handleSort('final_score')}
                      >
                        🎯 Final Score {sortField === 'final_score' && (
                          <span className="text-red-600 font-bold">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </TableHead>
                      <TableHead className="font-bold text-gray-700">📈 Avg Score</TableHead>
                      <TableHead className="font-bold text-gray-700">⚡ ASR(0.25)</TableHead>
                      <TableHead className="font-bold text-gray-700">🔥 ASR(1)</TableHead>
                      <TableHead className="font-bold text-gray-700">👁️ Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedData.length === 0 && !categorizing && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {searchKeyword ? 'No prompts found matching your search.' : 'No jailbreak prompts loaded. Please check if the dataset is available.'}
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredAndSortedData.map((row, i) => (
                    <TableRow 
                      key={i}
                      className={`transition-all duration-500 ease-out hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 ${
                        isLoaded 
                          ? 'opacity-100 translate-y-0' 
                          : 'opacity-0 translate-y-4'
                      } ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      style={{ 
                        transitionDelay: `${i * 50}ms` 
                      }}
                    >
                      <TableCell className="font-bold text-blue-600">#{i + 1}</TableCell>
                      <TableCell>{row.custom_id}</TableCell>
                      <TableCell>
                        {row.category && (
                          <span 
                            className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                            style={{ 
                              backgroundColor: JAILBREAK_CATEGORIES[row.category].color 
                            }}
                          >
                            {row.category}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {row.question}
                      </TableCell>
                      <TableCell>{row.final_score.toFixed(3)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AnimatedProgress
                            value={isLoaded ? Math.round(row.average_score * 100) : 0}
                            className="w-[120px]"
                            delay={i * 100}
                          />
                          <span className="text-sm">
                            {(row.average_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AnimatedProgress
                            value={isLoaded ? Math.round(row.asr_0_25 * 100) : 0}
                            className="w-[100px]"
                            delay={i * 100 + 200}
                          />
                          <span className="text-sm">
                            {(row.asr_0_25 * 100).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AnimatedProgress
                            value={isLoaded ? Math.round(row.asr_1 * 100) : 0}
                            className="w-[100px]"
                            delay={i * 100 + 400}
                          />
                          <span className="text-sm">
                            {(row.asr_1 * 100).toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
                            <SheetHeader>
                              <SheetTitle>Details - {row.custom_id}</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 space-y-4">
                              <Card className="p-3">
                                <p className="font-bold">Question:</p>
                                <p>{row.question}</p>
                              </Card>
                              <Card className="p-3">
                                <p className="font-bold">LLM Response:</p>
                                <p className="whitespace-pre-wrap">
                                  {row.llm_response}
                                </p>
                              </Card>
                              <Card className="p-3">
                                <p className="font-bold">Scores:</p>
                                <ul className="text-sm list-disc pl-5 space-y-1">
                                  <li>Final Score: {row.final_score}</li>
                                  <li>
                                    Average Score:{" "}
                                    {(row.average_score * 100).toFixed(1)}%
                                  </li>
                                  <li>
                                    Score (0.25): {row.score_0_25} | ASR(0.25):{" "}
                                    {(row.asr_0_25 * 100).toFixed(1)}%
                                  </li>
                                  <li>
                                    Score (1): {row.score_1} | ASR(1):{" "}
                                    {(row.asr_1 * 100).toFixed(1)}%
                                  </li>
                                </ul>
                              </Card>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
              
              {data.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      Highest score: {data.length > 0 ? Math.max(...data.map(d => d.final_score)).toFixed(3) : '0.000'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {evaluationResults.length > 0 && (
            <>
              <Card className="bg-black/50 backdrop-blur-3xl border-2 border-purple-500/30 shadow-2xl hover:shadow-purple-500/20 hover:shadow-3xl transition-all duration-700 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10"></div>
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full -translate-y-40 translate-x-40 group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-400/15 to-purple-600/15 rounded-full translate-y-32 -translate-x-32 group-hover:scale-125 transition-transform duration-1000 animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                {/* Neon border effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 via-pink-500/30 to-indigo-600/30 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700"></div>
                
                <CardHeader className="relative z-10 bg-gradient-to-r from-purple-600/80 via-pink-600/80 to-indigo-700/80 text-white backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="relative group/icon">
                        <div className="p-4 bg-gradient-to-br from-purple-500/40 to-pink-600/40 rounded-3xl backdrop-blur-sm border-2 border-purple-400/50 group-hover:scale-110 group/icon-hover:rotate-12 transition-all duration-500 shadow-2xl">
                          <span className="text-3xl filter drop-shadow-2xl">📊</span>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="px-3 py-1 bg-purple-500/30 border border-purple-400/40 rounded-full text-xs font-bold text-purple-200 uppercase tracking-wider">
                            Performance Analytics
                          </div>
                          <div className="px-3 py-1 bg-pink-500/30 border border-pink-400/40 rounded-full text-xs font-bold text-pink-200 uppercase tracking-wider">
                            Real-time
                          </div>
                        </div>
                        <CardTitle className="text-3xl font-black mb-3 tracking-tight">
                          <span className="bg-gradient-to-r from-purple-200 via-white to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                            Performance Dashboard
                          </span>
                        </CardTitle>
                        <p className="text-purple-100/80 text-base font-medium">
                          Comprehensive model evaluation metrics & security benchmarks
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/40 to-pink-600/40 backdrop-blur-sm rounded-2xl px-4 py-3 border-2 border-purple-400/40 shadow-xl">
                      <div className="text-2xl font-black text-transparent bg-gradient-to-r from-purple-200 to-white bg-clip-text">LIVE</div>
                      <div className="text-xs text-purple-300 font-semibold uppercase tracking-wide">Status</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  {performanceSummary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">🎯</div>
                          <div className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text mb-2 group-hover:from-blue-500 group-hover:to-cyan-500 transition-all duration-300">
                            {(performanceSummary.overallASR * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm font-bold text-blue-700 group-hover:text-blue-600 transition-colors duration-300">Overall ASR</div>
                        </div>
                      </div>
                      
                      <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">✅</div>
                          <div className="text-4xl font-black text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text mb-2 group-hover:from-green-500 group-hover:to-emerald-500 transition-all duration-300">
                            {performanceSummary.categoriesBelowBenchmark}
                          </div>
                          <div className="text-sm font-bold text-green-700 group-hover:text-green-600 transition-colors duration-300">Below Benchmark</div>
                        </div>
                      </div>
                      
                      <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-400/20 to-pink-600/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">⚠️</div>
                          <div className="text-4xl font-black text-transparent bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text mb-2 group-hover:from-red-500 group-hover:to-pink-500 transition-all duration-300">
                            {performanceSummary.highRiskCategories}
                          </div>
                          <div className="text-sm font-bold text-red-700 group-hover:text-red-600 transition-colors duration-300">High Risk</div>
                        </div>
                      </div>
                      
                      <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/30 p-6 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 cursor-pointer">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400/20 to-amber-600/20 rounded-full -translate-y-10 translate-x-10 group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="relative z-10 text-center">
                          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">📝</div>
                          <div className="text-4xl font-black text-transparent bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text mb-2 group-hover:from-orange-500 group-hover:to-amber-500 transition-all duration-300">
                            {performanceSummary.totalQuestions}
                          </div>
                          <div className="text-sm font-bold text-orange-700 group-hover:text-orange-600 transition-colors duration-300">Total Questions</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6 mt-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
                      🤖
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      AI Model Comparison Hub
                    </h2>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Select Model:</label>
                    <select 
                      value={selectedModel} 
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="px-4 py-2 bg-white border-2 border-indigo-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                    >
                      <option value="GPT-4">🧠 GPT-4</option>
                      <option value="GPT-3.5">💡 GPT-3.5</option>
                      <option value="Llama3.1">🦙 Llama3.1</option>
                      <option value="Llama3">🦙 Llama3</option>
                      <option value="Llama2">🦙 Llama2</option>
                      <option value="ChatGLM3">💬 ChatGLM3</option>
                      <option value="Vicuna">🦙 Vicuna</option>
                      <option value="DeepSeek-V3">🔍 DeepSeek-V3</option>
                      <option value="PaLM2">🌴 PaLM2</option>
                    </select>
                  </div>
                </div>
                
                <ModelComparisonTable 
                  evaluationResults={evaluationResults}
                  selectedModel={selectedModel}
                />
                
                <CategoryPerformanceChart 
                  evaluationResults={evaluationResults}
                  selectedModels={[selectedModel, 'GPT-3.5', 'Llama3.1']}
                />
              </div>
            </>
          )}
            )}
          </div>
        )}
      </div>
    </div>
  );
}

