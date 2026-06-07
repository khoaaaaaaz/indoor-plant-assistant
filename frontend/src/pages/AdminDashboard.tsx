// src/pages/AdminDashboard.tsx
import { useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { useAuth } from '@clerk/react';
import { 
  ShieldAlert, 
  Users, 
  Leaf, 
  Camera, 
  MessageSquare, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Star,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  CartesianGrid 
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CuteYellowFlowerPlant } from '@/components/icons/cute-plants';

export default function AdminDashboard() {
  const { isSignedIn } = useAuth();
  const { 
    isAdmin, 
    checkedAccess,
    stats, 
    feedbacks, 
    feedbackSummary,
    loadingMe,
    loadingStats, 
    loadingFeedbacks, 
    loadingSummary,
    checkAdmin, 
    fetchStats, 
    fetchFeedbacks, 
    fetchFeedbackSummary 
  } = useAdminStore();

  useEffect(() => {
    if (isSignedIn) {
      checkAdmin().then((isAuthorized) => {
        if (isAuthorized) {
          fetchStats();
          fetchFeedbacks();
          fetchFeedbackSummary();
        }
      });
    }
  }, [isSignedIn, checkAdmin, fetchStats, fetchFeedbacks, fetchFeedbackSummary]);

  // Loading Clerk or dynamic access check
  if (loadingMe || !checkedAccess) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-8">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <Skeleton className="h-6 w-96 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Not an authorized administrator
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 max-w-md mx-auto">
        <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-6 animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="font-headline text-headline-xl text-primary mb-3">
          Access Denied
        </h1>
        <p className="text-body-lg text-muted-foreground mb-6">
          You do not have administrative privileges. If you are a developer, please verify that your email is listed inside the <code className="bg-muted px-1.5 py-0.5 rounded text-sm text-destructive font-mono">ADMIN_EMAILS</code> environment variable inside your backend <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">.env</code> configuration.
        </p>
      </div>
    );
  }

  const isStatsLoading = loadingStats || !stats;
  const isFeedbacksLoading = loadingFeedbacks;
  const isSummaryLoading = loadingSummary || !feedbackSummary;

  return (
    <div className="flex flex-col gap-section-gap">
      {/* ─── Header ─── */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="secondary" className="gap-1 px-3 py-1 bg-accent text-accent-foreground rounded-full text-label-sm font-semibold">
            System Administrator
          </Badge>
        </div>
        <h1 className="font-headline text-headline-xl text-primary">
          Control Center
        </h1>
        <p className="text-body-lg text-muted-foreground max-w-2xl">
          System analytics, diagnostic feedback pipelines, and dynamic cache drift auditing.
        </p>
      </section>

      {/* ─── Section 1: Stat Cards Bento Grid ─── */}
      <section>
        {isStatsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Total Users */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <Users className="h-6 w-6 text-secondary" />
              </div>
              <span className="font-headline text-headline-xl text-primary font-semibold block leading-none mb-1">
                {stats.total_users}
              </span>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                Total Users
              </p>
            </div>

            {/* Total Plants */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <Leaf className="h-6 w-6 text-secondary" />
              </div>
              <span className="font-headline text-headline-xl text-primary font-semibold block leading-none mb-1">
                {stats.total_plants}
              </span>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                Total Plants
              </p>
            </div>

            {/* Total Scans */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <Camera className="h-6 w-6 text-secondary" />
              </div>
              <span className="font-headline text-headline-xl text-primary font-semibold block leading-none mb-1">
                {stats.total_scans}
              </span>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                Total Scans
              </p>
            </div>

            {/* Diseases Gated */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <MessageSquare className="h-6 w-6 text-secondary" />
              </div>
              <span className="font-headline text-headline-xl text-primary font-semibold block leading-none mb-1">
                {stats.total_feedbacks}
              </span>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                Feedbacks
              </p>
            </div>

            {/* AI Confidence */}
            <div className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent rounded-full blur-2xl opacity-20 -mr-8 -mt-8 pointer-events-none" />
              <div className="flex justify-between items-start mb-4">
                <Activity className="h-6 w-6 text-secondary" />
              </div>
              <span className="font-headline text-headline-xl text-primary font-semibold block leading-none mb-1">
                {Math.round(stats.avg_confidence * 100)}%
              </span>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider">
                AI Accuracy
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ─── Section 2: Recharts Visualizations (React 19 Gated) ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scans Over Time Area Chart (Spans 2 columns) */}
        <div className="col-span-1 md:col-span-2 bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-headline text-headline-lg-mobile md:text-xl text-primary font-semibold">
                Scan Activity Trends
              </h3>
              <p className="text-body-sm text-muted-foreground">
                Daily scans recorded in the rolling 14-day window.
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>

          {isStatsLoading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : stats.scans_over_time.length === 0 || stats.scans_over_time.every(s => s.count === 0) ? (
            /* Zero data check */
            <div className="h-[300px] flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed border-border/60 rounded-2xl p-6">
              <CuteYellowFlowerPlant size={64} className="mb-3 opacity-60" />
              <p className="text-body-md text-muted-foreground font-semibold">No recent scan activity</p>
              <p className="text-body-sm text-muted-foreground/85">No plants were scanned in the past 14 days.</p>
            </div>
          ) : (
            /* React 19 Container Height Guard: explicit height div around ResponsiveContainer */
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={stats.scans_over_time}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2d4739" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2d4739" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--muted-foreground)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                    }}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      borderColor: 'rgba(0,0,0,0.1)', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#2d4739" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorScans)" 
                    name="Scans"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Disease Distribution Bar Chart */}
        <div className="col-span-1 bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-headline text-headline-lg-mobile md:text-xl text-primary font-semibold">
                Disease Breakdown
              </h3>
              <p className="text-body-sm text-muted-foreground">
                Distribution of detected diseases.
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>

          {isStatsLoading ? (
            <Skeleton className="h-[300px] w-full rounded-2xl" />
          ) : stats.disease_distribution.length === 0 ? (
            /* Zero data check */
            <div className="h-[300px] flex flex-col items-center justify-center text-center bg-muted/20 border border-dashed border-border/60 rounded-2xl p-6">
              <CheckCircle2 className="h-10 w-10 text-secondary mb-3" />
              <p className="text-body-md text-muted-foreground font-semibold">Ecosystem is healthy</p>
              <p className="text-body-sm text-muted-foreground/85">No plant diseases have been diagnosed yet.</p>
            </div>
          ) : (
            /* React 19 Container Height Guard */
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={stats.disease_distribution}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis 
                    type="number" 
                    stroke="var(--muted-foreground)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis 
                    dataKey="disease" 
                    type="category" 
                    stroke="var(--muted-foreground)" 
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'var(--card)', 
                      borderColor: 'rgba(0,0,0,0.1)', 
                      borderRadius: '12px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#486643" 
                    radius={[0, 6, 6, 0]}
                    name="Cases"
                    barSize={12}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* ─── Section 3: Diagnostic Feedback Logs Table ─── */}
      <section className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary">
              Diagnostic Feedback Pipeline
            </h2>
            <p className="text-body-md text-muted-foreground">
              Individual user feedback scores submitted post-treatment. Real-time reviews from garden owners.
            </p>
          </div>
        </div>

        {isFeedbacksLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/10 border border-dashed border-border/60 rounded-2xl">
            <MessageSquare className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-headline text-lg text-primary font-medium mb-1">
              No Feedback Logs
            </h3>
            <p className="text-body-sm text-muted-foreground">
              User evaluations will automatically appear here once plants recover and users submit surveys.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/60 text-label-sm text-muted-foreground font-semibold">
                  <th className="pb-3 pr-4">Plant & Owner</th>
                  <th className="pb-3 pr-4">Diagnosed Disease</th>
                  <th className="pb-3 pr-4">AI Conf.</th>
                  <th className="pb-3 pr-4">Rating</th>
                  <th className="pb-3 pr-4">Survey Comments</th>
                  <th className="pb-3">Logged Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-body-sm">
                {feedbacks.map((item) => {
                  const score = item.feedback_score;
                  // Color codes row based on rating
                  const rowBg = score <= 2 
                    ? 'hover:bg-red-50/30 dark:hover:bg-red-950/10' 
                    : score >= 4 
                      ? 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10' 
                      : 'hover:bg-muted/30';
                  
                  return (
                    <tr key={item.id} className={`transition-colors ${rowBg}`}>
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-primary">{item.plant_name}</div>
                        <div className="text-xs text-muted-foreground">{item.user_email}</div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="font-semibold">{item.disease_name}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground font-mono">
                        {item.confidence ? `${Math.round(item.confidence * 100)}%` : '—'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star 
                              key={idx} 
                              className={`h-3.5 w-3.5 ${
                                idx < score 
                                  ? 'fill-amber-400 text-amber-400' 
                                  : 'text-border dark:text-muted/40'
                              }`} 
                            />
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 max-w-xs text-muted-foreground italic truncate" title={item.feedback_note || ''}>
                        {item.feedback_note || <span className="opacity-40">No comment submitted</span>}
                      </td>
                      <td className="py-3.5 text-muted-foreground font-mono text-xs">
                        {item.scanned_at ? new Date(item.scanned_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ─── Section 4: Per-Disease Feedback Aggregated Summary ─── */}
      <section className="bg-card rounded-3xl p-6 border border-border/50 shadow-sm">
        <div className="mb-6">
          <h2 className="font-headline text-headline-lg-mobile md:text-headline-lg text-primary">
            Aggregated Treatment Evaluation
          </h2>
          <p className="text-body-md text-muted-foreground">
            Evaluation of botanical treatment protocols sorted by diagnosed disease. Helps developers catch drifting cache rules.
          </p>
        </div>

        {isSummaryLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        ) : Object.keys(feedbackSummary.per_disease).length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 bg-muted/10 border border-dashed border-border/60 rounded-2xl">
            <Activity className="h-10 w-10 text-muted-foreground/60 mb-2" />
            <p className="text-body-sm text-muted-foreground">No aggregated summaries available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(feedbackSummary.per_disease).map(([diseaseName, summary]) => {
              const isFlagged = summary.avg_score < 3.0;
              return (
                <div 
                  key={diseaseName} 
                  className={`rounded-2xl p-5 border transition-all ${
                    isFlagged 
                      ? 'border-destructive/30 bg-destructive/5' 
                      : 'border-border/50 bg-card hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <h4 className="font-headline text-xl text-primary font-semibold">
                        {diseaseName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Based on {summary.feedback_count} user evaluation(s)
                      </p>
                    </div>
                    {isFlagged && (
                      <Badge variant="destructive" className="gap-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        Low Satisfaction
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 bg-muted/20 dark:bg-muted/5 rounded-xl p-3 text-center">
                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Average Score</span>
                      <span className={`font-headline text-2xl font-semibold ${
                        isFlagged ? 'text-destructive font-bold' : 'text-primary'
                      }`}>
                        {summary.avg_score} <span className="text-xs text-muted-foreground">/ 5</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">High Conf. Score</span>
                      <span className="font-headline text-xl text-muted-foreground font-semibold block pt-0.5">
                        {summary.high_confidence_avg_score !== null ? `${summary.high_confidence_avg_score}` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs text-muted-foreground block mb-0.5">Low Conf. Score</span>
                      <span className="font-headline text-xl text-muted-foreground font-semibold block pt-0.5">
                        {summary.low_confidence_avg_score !== null ? `${summary.low_confidence_avg_score}` : '—'}
                      </span>
                    </div>
                  </div>

                  {isFlagged && (
                    <p className="text-xs text-destructive font-medium mt-3 leading-relaxed">
                      {summary.flag} Check that cached static LLM advice is valid by using the audit tab.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
