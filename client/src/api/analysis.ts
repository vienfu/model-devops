import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  CreateAnalysisReportRequest,
  AnalysisReportListResponse,
  AnalysisReportDetail,
} from '@shared/api.interface';

export async function createReport(data: CreateAnalysisReportRequest): Promise<{ id: string }> {
  const response = await axiosForBackend({
    url: '/api/analysis-reports',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function getReportList(page: number = 1, pageSize: number = 10): Promise<AnalysisReportListResponse> {
  const response = await axiosForBackend({
    url: '/api/analysis-reports',
    method: 'GET',
    params: { page, pageSize },
  });
  return response.data;
}

export async function getReportDetail(id: string): Promise<AnalysisReportDetail> {
  const response = await axiosForBackend({
    url: `/api/analysis-reports/${id}`,
    method: 'GET',
  });
  return response.data;
}
