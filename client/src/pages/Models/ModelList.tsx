import React from 'react';
import { Input } from '@client/src/components/ui/input';
import { Skeleton } from '@client/src/components/ui/skeleton';
import { Search } from 'lucide-react';
import type { ModelListItem } from '@shared/api.interface';

interface ModelListProps {
  models: ModelListItem[];
  selectedModelId: string | null;
  onSelect: (id: string) => void;
  keyword: string;
  onKeywordChange: (value: string) => void;
  loading: boolean;
}

const ModelList: React.FC<ModelListProps> = ({
  models,
  selectedModelId,
  onSelect,
  keyword,
  onKeywordChange,
  loading,
}) => {
  return (
    <div className="flex h-full flex-col rounded-sm border border-border bg-muted/50">
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索模型..."
            value={keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onKeywordChange(e.target.value)
            }
            className="rounded-sm pl-8"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 5 }).map((_, i: number) => (
              <Skeleton key={i} className="h-20 w-full rounded-sm" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            暂无模型数据
          </div>
        ) : (
          <div className="space-y-1">
            {models.map((m: ModelListItem) => (
              <div
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`cursor-pointer rounded-sm p-3 transition-colors ${
                  selectedModelId === m.id
                    ? 'border-l-2 border-primary bg-accent'
                    : 'hover:bg-accent/50'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {m.name}
                  </span>
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      m.status === 'active'
                        ? 'bg-green-500'
                        : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    调用{' '}
                    <span className="font-mono">
                      {m.apiCalls.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    成功率{' '}
                    <span className="font-mono">
                      {m.successRate}%
                    </span>
                  </span>
                  <span>
                    延时{' '}
                    <span className="font-mono">
                      {m.avgLatency}ms
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelList;
