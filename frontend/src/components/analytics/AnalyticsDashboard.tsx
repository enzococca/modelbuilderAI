import { useEffect, useState } from 'react';
import { BarChart3, DollarSign, Cpu, Clock, TrendingUp } from 'lucide-react';
import { getUsageSummary, getDailyUsage } from '@/services/api';
import type { UsageSummary, DailyUsage, ModelUsage } from '@/types';

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof BarChart3; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
        <Icon className="w-4 h-4" />
        {label}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function ModelRow({ m }: { m: ModelUsage }) {
  return (
    <tr className="border-b border-gray-800">
      <td className="py-2 px-3 text-sm">{m.model}</td>
      <td className="py-2 px-3 text-sm text-gray-400">{m.provider}</td>
      <td className="py-2 px-3 text-sm text-right">{m.requests.toLocaleString()}</td>
      <td className="py-2 px-3 text-sm text-right">{m.total_tokens.toLocaleString()}</td>
      <td className="py-2 px-3 text-sm text-right text-green-400">${m.total_cost.toFixed(4)}</td>
      <td className="py-2 px-3 text-sm text-right text-gray-400">{m.avg_duration_ms.toFixed(0)}ms</td>
    </tr>
  );
}

function UsageBar({ daily, maxTokens }: { daily: DailyUsage[]; maxTokens: number }) {
  if (maxTokens === 0) return null;
  return (
    <div className="flex items-end gap-1 h-32">
      {daily.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-blue-500/60 rounded-t min-h-[2px]"
            style={{ height: `${(d.total_tokens / maxTokens) * 100}%` }}
            title={`${d.date}: ${d.total_tokens.toLocaleString()} tokens`}
          />
          <span className="text-[10px] text-gray-600 rotate-[-45deg] origin-top-left whitespace-nowrap">
            {d.date.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboard() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = (period: number) => {
    setLoading(true);
    setError(null);
    Promise.all([getUsageSummary(period), getDailyUsage(period)])
      .then(([s, d]) => {
        setSummary(s);
        setDaily(d);
      })
      .catch((err) => {
        setSummary(null);
        setDaily([]);
        const msg = err?.code === 'ECONNABORTED'
          ? 'Timeout: il backend non risponde. Verifica che il server sia avviato.'
          : err?.response?.status === 500
            ? 'Errore interno del server. Riprova tra qualche secondo.'
            : 'Impossibile caricare i dati analytics. Il backend potrebbe essere ancora in avvio.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData(days);
  }, [days]);

  const maxTokens = Math.max(...daily.map((d) => d.total_tokens), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Analytics Dashboard
          </h1>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-sm ${
                  days === d ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading analytics...</div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchData(days)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
            >
              Riprova
            </button>
          </div>
        ) : !summary ? (
          <div className="text-gray-500 text-center py-12">No usage data yet. Start chatting to see analytics.</div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={BarChart3}
                label="Total Requests"
                value={summary.total_requests.toLocaleString()}
                sub={`Last ${days} days`}
              />
              <StatCard
                icon={Cpu}
                label="Total Tokens"
                value={summary.total_tokens.toLocaleString()}
              />
              <StatCard
                icon={DollarSign}
                label="Estimated Cost"
                value={`$${summary.total_cost.toFixed(2)}`}
              />
              <StatCard
                icon={Clock}
                label="Models Used"
                value={String(summary.by_model.length)}
              />
            </div>

            {daily.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-8">
                <h2 className="text-sm font-medium text-gray-300 mb-4">Daily Token Usage</h2>
                <UsageBar daily={daily} maxTokens={maxTokens} />
              </div>
            )}

            {summary.by_model.length > 0 && (
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <h2 className="text-sm font-medium text-gray-300 p-4 border-b border-gray-700">Usage by Model</h2>
                <table className="w-full">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-gray-700">
                      <th className="py-2 px-3 text-left">Model</th>
                      <th className="py-2 px-3 text-left">Provider</th>
                      <th className="py-2 px-3 text-right">Requests</th>
                      <th className="py-2 px-3 text-right">Tokens</th>
                      <th className="py-2 px-3 text-right">Cost</th>
                      <th className="py-2 px-3 text-right">Avg Latency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.by_model.map((m) => (
                      <ModelRow key={m.model} m={m} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
