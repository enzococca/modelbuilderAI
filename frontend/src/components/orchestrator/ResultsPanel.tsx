import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

export function ResultsPanel({ result }: { result: string | null }) {
  return (
    <div className="p-4">
      <h3 className="text-sm text-gray-400 uppercase tracking-wide mb-3">Results</h3>
      {result ? (
        <div className="prose prose-invert prose-sm max-w-none">
          <MarkdownRenderer content={result} />
        </div>
      ) : (
        <div className="text-sm text-gray-500 text-center py-8">
          Esegui un workflow per vedere i risultati qui.
        </div>
      )}
    </div>
  );
}
