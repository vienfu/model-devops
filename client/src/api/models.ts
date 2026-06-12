import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { ModelListResponse, ModelMetricsResponse } from '@shared/api.interface';

export async function getModelList(keyword?: string): Promise<ModelListResponse> {
  const response = await axiosForBackend({
    url: '/api/models',
    method: 'GET',
    params: { keyword },
  });
  return response.data;
}

export async function getModelMetrics(id: string, timeRange: string): Promise<ModelMetricsResponse> {
  const response = await axiosForBackend({
    url: `/api/models/${id}/metrics`,
    method: 'GET',
    params: { timeRange },
  });
  return response.data;
}
