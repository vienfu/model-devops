import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  AlertRuleListResponse,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertRecordListResponse,
} from '@shared/api.interface';

export async function getRuleList(): Promise<AlertRuleListResponse> {
  const response = await axiosForBackend({
    url: '/api/alert-rules',
    method: 'GET',
  });
  return response.data;
}

export async function createRule(data: CreateAlertRuleRequest): Promise<{ id: string }> {
  const response = await axiosForBackend({
    url: '/api/alert-rules',
    method: 'POST',
    data,
  });
  return response.data;
}

export async function updateRule(id: string, data: UpdateAlertRuleRequest): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/alert-rules/${id}`,
    method: 'PUT',
    data,
  });
  return response.data;
}

export async function deleteRule(id: string): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/alert-rules/${id}`,
    method: 'DELETE',
  });
  return response.data;
}

export async function toggleRule(id: string, enabled: boolean): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/alert-rules/${id}/toggle`,
    method: 'PATCH',
    data: { enabled },
  });
  return response.data;
}

export async function getRecordList(params: {
  timeRange?: string;
  level?: string;
  page?: number;
  pageSize?: number;
}): Promise<AlertRecordListResponse> {
  const response = await axiosForBackend({
    url: '/api/alert-records',
    method: 'GET',
    params,
  });
  return response.data;
}

export async function resendNotification(id: string): Promise<{ success: boolean }> {
  const response = await axiosForBackend({
    url: `/api/alert-records/${id}/resend`,
    method: 'POST',
  });
  return response.data;
}
