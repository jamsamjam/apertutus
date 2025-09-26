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
    <div className="p-6 space-y-6">
      <Card className={`transition-all duration-700 ease-out ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-black dark:text-white">
            Jailbreak Dataset Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Analysis of 537 multi-turn jailbreak prompts from MHJ dataset
          </p>
        </CardHeader>
        <CardContent>
          {categorizing && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Categorizing prompts...</p>
              </div>
            </div>
          )}
          
          {categoryStats.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Category Distribution</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pie Chart */}
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryStats.map(stat => ({
                          name: stat.category,
                          value: stat.count,
                          color: stat.color,
                          percentage: stat.percentage
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({percentage}: any) => `${percentage.toFixed(1)}%`}
                        labelLine={false}
                      >
                        {categoryStats.map((stat, index) => (
                          <Cell key={`cell-${index}`} fill={stat.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(name) => `${name}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend and Stats */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base mb-4">Categories ({data.length} total prompts)</h4>
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {categoryStats
                      .sort((a, b) => b.count - a.count)
                      .map((stat, index) => (
                      <div 
                        key={stat.category}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-500 ease-out ${
                          isLoaded 
                            ? 'opacity-100 translate-x-0' 
                            : 'opacity-0 translate-x-4'
                        }`}
                        style={{ 
                          transitionDelay: `${index * 100 + 500}ms`,
                          borderLeft: `4px solid ${stat.color}`
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: stat.color }}
                          />
                          <div>
                            <h5 className="font-medium text-sm">{stat.category}</h5>
                            <p className="text-xs text-gray-500 max-w-xs truncate">{stat.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{stat.count}</div>
                          <div className="text-xs text-gray-600">{stat.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`transition-all duration-700 ease-out ${
        isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`} style={{ transitionDelay: '200ms' }}>
        <CardHeader>
          <CardTitle>Top 10 Jailbreak Prompts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing highest scoring jailbreak attempts (sorted by final score)
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Final Score</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>ASR(0.25)</TableHead>
                <TableHead>ASR(1)</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && !categorizing && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No jailbreak prompts loaded. Please check if the dataset is available.
                  </TableCell>
                </TableRow>
              )}
              {data
                .sort((a, b) => b.final_score - a.final_score)
                .slice(0, 10)
                .map((row, i) => (
                <TableRow 
                  key={i}
                  className={`transition-all duration-500 ease-out ${
                    isLoaded 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-4'
                  }`}
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
          
          {data.length > 10 && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing top 10 of {data.length} total jailbreak prompts</span>
                <span>
                  Highest score: {data.length > 0 ? Math.max(...data.map(d => d.final_score)).toFixed(3) : '0.000'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Comparison Section */}
      {evaluationResults.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {performanceSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {(performanceSummary.overallASR * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall ASR</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {performanceSummary.categoriesBelowBenchmark}
                    </div>
                    <div className="text-sm text-muted-foreground">Categories Below Benchmark</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {performanceSummary.highRiskCategories}
                    </div>
                    <div className="text-sm text-muted-foreground">High Risk Categories</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {performanceSummary.totalQuestions}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Questions</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Model Comparison</h2>
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="GPT-4">GPT-4</option>
                <option value="GPT-3.5">GPT-3.5</option>
                <option value="Llama3.1">Llama3.1</option>
                <option value="Llama3">Llama3</option>
                <option value="Llama2">Llama2</option>
                <option value="ChatGLM3">ChatGLM3</option>
                <option value="Vicuna">Vicuna</option>
                <option value="DeepSeek-V3">DeepSeek-V3</option>
                <option value="PaLM2">PaLM2</option>
              </select>
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
    </div>
  );
}
