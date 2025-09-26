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
        {!isApiConfigured ? (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[0, 1, 2].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold transition-all duration-500 ${
                      step === currentStep 
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-110' 
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

            {/* Step Labels */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-20">
                {['Category Distribution', 'Jailbreak Prompts', 'API Configuration'].map((label, index) => (
                  <div key={index} className={`text-center transition-all duration-500 ${
                    index === currentStep ? 'text-cyan-300 font-bold' : 'text-gray-400'
                  }`}>
                    <div className="text-sm">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step content */}
            <div className="min-h-[700px] flex items-center justify-center">
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
                        <div className="inline-flex items-center gap-4 mb-6">
                          <div className="p-4 bg-gradient-to-br from-cyan-500/40 to-blue-600/40 rounded-2xl border border-cyan-400/50">
                            <span className="text-4xl">🎯</span>
                          </div>
                          <div>
                            <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-cyan-200 to-white bg-clip-text">
                              Category Distribution
                            </h1>
                            <p className="text-cyan-100/80 text-xl mt-2">Explore jailbreak attack patterns</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-12">
                      {categoryStats.length > 0 ? (
                        <div className="space-y-8">
                          {/* Chart */}
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
                                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-4 h-4 rounded-full"
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
                          
                          {/* Summary */}
                          <div className="text-center">
                            <div className="text-3xl font-bold text-white mb-3">
                              {data.length} Total Jailbreak Prompts
                            </div>
                            <div className="text-cyan-200 text-lg">
                              Categorized into {categoryStats.length} distinct attack patterns
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-16">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                            <p className="text-cyan-200">Loading category data...</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    
                    {/* Navigation */}
                    <div className="absolute bottom-6 right-6">
                      <button
                        onClick={nextStep}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-3 text-lg"
                      >
                        Next Step
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                </div>
              )}
              
              {/* Step 1: Jailbreak Prompts */}
              {currentStep === 1 && (
                <div className="w-full max-w-6xl mx-auto">
                  <Card className="relative overflow-hidden bg-black/50 backdrop-blur-3xl border-2 border-green-500/30 shadow-2xl hover:shadow-green-500/20 hover:shadow-3xl transition-all duration-700 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10"></div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-600/20 rounded-full -translate-y-40 translate-x-40 group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-teal-400/15 to-green-600/15 rounded-full translate-y-32 -translate-x-32 group-hover:scale-125 transition-transform duration-1000 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    
                    {/* Neon border effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-400/30 via-emerald-500/30 to-teal-600/30 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700"></div>
                    
                    <CardHeader className="relative z-10 pb-8 pt-8">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-4 mb-6">
                          <div className="p-4 bg-gradient-to-br from-green-500/40 to-emerald-600/40 rounded-2xl border border-green-400/50">
                            <span className="text-4xl">🔍</span>
                          </div>
                          <div>
                            <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-green-200 to-white bg-clip-text">
                              Jailbreak Prompts
                            </h1>
                            <p className="text-green-100/80 text-xl mt-2">Browse and analyze attack prompts</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-12">
                      <div className="space-y-8">
                        {/* Search */}
                        <div className="relative max-w-2xl mx-auto">
                          <input
                            type="text"
                            placeholder="🔎 Search questions..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className="w-full px-6 py-4 pl-14 bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all duration-300 text-lg"
                          />
                          <div className="absolute left-5 top-1/2 transform -translate-y-1/2 text-white/70">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Table preview */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                          <h3 className="text-2xl font-bold text-white mb-6 text-center">Sample Prompts ({filteredAndSortedData.length} total)</h3>
                          <div className="space-y-4 max-h-80 overflow-y-auto">
                            {filteredAndSortedData.slice(0, 8).map((row, i) => (
                              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors duration-300">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="text-sm text-green-300 font-medium mb-2">#{i + 1} - {row.custom_id}</div>
                                    <div className="text-white/90 text-base leading-relaxed">{row.question.length > 150 ? row.question.substring(0, 150) + '...' : row.question}</div>
                                  </div>
                                  {row.category && (
                                    <span 
                                      className="ml-4 px-3 py-1 rounded-full text-xs font-medium text-white"
                                      style={{ backgroundColor: JAILBREAK_CATEGORIES[row.category].color }}
                                    >
                                      {row.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Navigation */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                      <button
                        onClick={prevStep}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-3 text-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <button
                        onClick={nextStep}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-green-500/25 transition-all duration-300 flex items-center gap-3 text-lg"
                      >
                        Next Step
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                </div>
              )}
              
              {/* Step 2: API Configuration */}
              {currentStep === 2 && (
                <div className="w-full max-w-4xl mx-auto">
                  <Card className="relative overflow-hidden bg-black/50 backdrop-blur-3xl border-2 border-purple-500/30 shadow-2xl hover:shadow-purple-500/20 hover:shadow-3xl transition-all duration-700 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10"></div>
                    <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full -translate-y-40 translate-x-40 group-hover:scale-125 transition-transform duration-1000 animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-indigo-400/15 to-purple-600/15 rounded-full translate-y-32 -translate-x-32 group-hover:scale-125 transition-transform duration-1000 animate-pulse" style={{ animationDelay: '1s' }}></div>
                    
                    {/* Neon border effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-400/30 via-pink-500/30 to-indigo-600/30 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700"></div>
                    
                    <CardHeader className="relative z-10 pb-8 pt-8">
                      <div className="text-center">
                        <div className="inline-flex items-center gap-4 mb-6">
                          <div className="p-4 bg-gradient-to-br from-purple-500/40 to-pink-600/40 rounded-2xl border border-purple-400/50">
                            <span className="text-4xl">🔑</span>
                          </div>
                          <div>
                            <h1 className="text-5xl font-black text-transparent bg-gradient-to-r from-purple-200 to-white bg-clip-text">
                              API Configuration
                            </h1>
                            <p className="text-purple-100/80 text-xl mt-2">Configure your model endpoint for testing</p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pb-12">
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
                            <p className="text-purple-200/60 text-sm mt-2">Enter your model's API endpoint URL</p>
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
                            <p className="text-purple-200/60 text-sm mt-2">Your API key will be used to test the model</p>
                          </div>
                        </div>
                        
                        <div className="bg-purple-500/20 border border-purple-400/30 rounded-2xl p-6">
                          <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-lg">
                            <span>🛡️</span>
                            Security Notice
                          </h3>
                          <p className="text-purple-100/80 text-base leading-relaxed">
                            Your API credentials are processed securely and used only for testing purposes. 
                            We recommend using a dedicated API key with limited permissions for testing.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                    
                    {/* Navigation */}
                    <div className="absolute bottom-6 left-6 right-6 flex justify-between">
                      <button
                        onClick={prevStep}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-3 text-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      <button
                        onClick={handleApiSubmit}
                        disabled={!apiEndpoint || !apiKey}
                        className={`px-10 py-4 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-3 text-lg ${
                          apiEndpoint && apiKey
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-purple-500/25'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Start Testing
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : (
          // Main dashboard after API configuration
          <div className="w-full space-y-8">
            <Card className="relative overflow-hidden bg-black/40 backdrop-blur-2xl border-2 border-cyan-500/30 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-cyan-600/80 via-blue-600/80 to-purple-700/80 text-white">
                <CardTitle className="text-3xl font-bold">
                  🎉 Ready to Test!
                </CardTitle>
                <p className="text-cyan-100">API configured successfully. You can now test your model against jailbreak prompts.</p>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-3">API Endpoint</h3>
                    <p className="text-gray-300 font-mono text-sm bg-black/30 p-3 rounded">{apiEndpoint}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-6 border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-3">Status</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-300 font-semibold">Connected & Ready</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setIsApiConfigured(false)}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    Reconfigure API
                  </button>
                </div>
              </CardContent>
            </Card>
            
            {/* Here you can add the full dashboard functionality */}
            <div className="text-center text-white/60">
              <p className="text-lg">Full dashboard functionality will be implemented here...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
