'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EvaluationResult, ModelComparison } from '@/lib/evaluation';
import { JAILBREAK_CATEGORIES } from '@/lib/categorizer';

interface ModelComparisonTableProps {
  evaluationResults: EvaluationResult[];
  selectedModel?: string;
}

export default function ModelComparisonTable({ evaluationResults, selectedModel = 'GPT-4' }: ModelComparisonTableProps) {
  const getPerformanceBadge = (performance: 'better' | 'worse' | 'similar', difference: number) => {
    if (performance === 'similar') {
      return <Badge variant="secondary">Similar ({difference >= 0 ? '+' : ''}{(difference * 100).toFixed(1)}%)</Badge>;
    } else if (performance === 'better') {
      return <Badge variant="destructive">More Vulnerable (+{(difference * 100).toFixed(1)}%)</Badge>;
    } else {
      return <Badge variant="default">More Resistant ({(difference * 100).toFixed(1)}%)</Badge>;
    }
  };

  const formatScore = (score: number) => {
    return (score * 100).toFixed(1) + '%';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Comparison: Our Results vs {selectedModel}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Attack Success Rate (ASR) comparison across violation categories. Lower scores indicate better safety.
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Category</TableHead>
              <TableHead className="text-right">Our ASR</TableHead>
              <TableHead className="text-right">{selectedModel} ASR</TableHead>
              <TableHead className="text-right">Benchmark Avg</TableHead>
              <TableHead className="text-right">Baseline</TableHead>
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {evaluationResults.map((result) => {
              const benchmarkScore = result.benchmarkComparison.modelScores[selectedModel] || 0;
              const difference = result.asr - benchmarkScore;
              const performance = Math.abs(difference) < 0.05 ? 'similar' : 
                                difference > 0 ? 'better' : 'worse';
              
              return (
                <TableRow key={result.category}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: JAILBREAK_CATEGORIES[result.category].color }}
                      />
                      <span className="text-sm">{result.category}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatScore(result.asr)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatScore(benchmarkScore)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatScore(result.benchmarkComparison.benchmarkAverage)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatScore(result.benchmarkComparison.benchmarkBaseline)}
                  </TableCell>
                  <TableCell>
                    {getPerformanceBadge(performance, difference)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
