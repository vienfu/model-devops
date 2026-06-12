import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ModelListItem,
  ModelMetricsResponse,
} from '@shared/api.interface';
import * as modelsApi from '@client/src/api/models';
import ModelList from './ModelList';
import ModelMetrics from './ModelMetrics';

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelListItem[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<
    string | null
  >(null);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [keyword, setKeyword] = useState<string>('');
  const [listLoading, setListLoading] = useState<boolean>(true);
  const [metricsLoading, setMetricsLoading] =
    useState<boolean>(false);
  const [metrics, setMetrics] =
    useState<ModelMetricsResponse | null>(null);

  const fetchModels = useCallback(
    async (kw?: string) => {
      setListLoading(true);
      try {
        const res = await modelsApi.getModelList(kw);
        setModels(res.items);
        if (
          res.items.length > 0 &&
          (!selectedModelId ||
            !res.items.find(
              (m: ModelListItem) => m.id === selectedModelId,
            ))
        ) {
          setSelectedModelId(res.items[0].id);
        }
      } catch (err: unknown) {
        logger.error(
          'Failed to fetch model list',
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        setListLoading(false);
      }
    },
    [selectedModelId],
  );

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchModels(keyword || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (!selectedModelId) {
      setMetrics(null);
      return;
    }
    let cancelled = false;
    const fetchMetrics = async () => {
      setMetricsLoading(true);
      try {
        const res = await modelsApi.getModelMetrics(
          selectedModelId,
          timeRange,
        );
        if (!cancelled) {
          setMetrics(res);
        }
      } catch (err: unknown) {
        logger.error(
          'Failed to fetch model metrics',
          err instanceof Error ? err.message : String(err),
        );
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    };
    fetchMetrics();
    return () => {
      cancelled = true;
    };
  }, [selectedModelId, timeRange]);

  const selectedModel = models.find(
    (m: ModelListItem) => m.id === selectedModelId,
  );

  return (
    <div className="flex h-full gap-3 p-3">
      <div className="w-[30%] min-w-[260px]">
        <ModelList
          models={models}
          selectedModelId={selectedModelId}
          onSelect={setSelectedModelId}
          keyword={keyword}
          onKeywordChange={setKeyword}
          loading={listLoading}
        />
      </div>
      <div className="flex-1 overflow-auto rounded-sm border border-border bg-card">
        {selectedModelId ? (
          <ModelMetrics
            metrics={metrics}
            loading={metricsLoading}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            modelName={selectedModel?.name ?? ''}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            请从左侧选择一个模型查看指标详情
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelsPage;
