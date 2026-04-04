'use client';

import { useQuery } from '@tanstack/react-query';
import { getTaskStats } from '@/lib/api/tasks';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, Trophy, CheckCircle2, Loader2, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export default function ProgressReportPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['taskStats'],
    queryFn: getTaskStats,
  });

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Navbar />

      <div className="flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">
        <main className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">Progress Report</h1>
            <p className="text-sm text-muted-foreground">
              Track your productivity and task completion trends.
            </p>
          </div>

          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex h-[400px] items-center justify-center text-destructive">
              Failed to load progress report.
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Quick Stats Row */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.quickStats.completionRate}%</div>
                    <p className="text-xs text-muted-foreground">Of all created tasks</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Most Productive Day</CardTitle>
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.quickStats.mostProductiveDay}</div>
                    <p className="text-xs text-muted-foreground">Day with most tasks finished</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Finished</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data?.quickStats.totalCompleted}</div>
                    <p className="text-xs text-muted-foreground">Tasks marked as completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Row */}
              <Card>
                <CardHeader>
                  <CardTitle>Tasks Completed vs. Missed</CardTitle>
                  <CardDescription>
                    Your activity over the last 7 days.
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-2 sm:p-6">
                  {data?.chartData && data.chartData.length > 0 ? (
                    <div className="h-[350px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.chartData.slice().reverse()} // Reverse to show oldest to newest left to right
                          margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/50" />
                          <XAxis
                            dataKey="date"
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                          />
                          <YAxis
                            stroke="#888888"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
                            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                          />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                          <Bar dataKey="completed" name="Completed" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                          <Bar dataKey="missed" name="Missed" fill="var(--destructive)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Info className="h-8 w-8" />
                        <p>Not enough data to generate chart yet.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}