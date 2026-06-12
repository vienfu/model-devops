import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type { DashboardKpisResponse, DashboardTrendsResponse } from '@shared/api.interface';

export async function getKpis(timeRange: string): Promise<DashboardKpisResponse> {
  const response = await axiosForBackend({
    url: '/api/dashboard/kpis',
    method: 'GET',
    params: { timeRange },
  });
  return response.data;
}

export async function getTrends(timeRange: string): Promise<DashboardTrendsResponse> {
  const response = await axiosForBackend({
    url: '/api/dashboard/trends',
    method: 'GET',
    params: { timeRange },
  });
  return response.data;
}
