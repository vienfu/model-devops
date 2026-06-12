import { Injectable, Logger } from '@nestjs/common';
import http from 'node:http';

const PROMETHEUS_BASE_URL =
  process.env.PROMETHEUS_URL || 'http://101.126.91.24:31555';

interface VectorResult {
  metric: Record<string, string>;
  value: [number, string];
}

interface MatrixResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

interface PrometheusApiResponse<T> {
  status: string;
  data: { resultType: string; result: T[] };
}

@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);

  private static readonly REQUEST_TIMEOUT_MS = 30000;
  private static readonly MAX_RETRIES = 3;

  private async rawPost(
    path: string,
    params: Record<string, string>,
  ): Promise<string> {
    const body = Object.entries(params)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(v)}`,
      )
      .join('&');

    const doRequest = (): Promise<string> =>
      new Promise<string>((resolve, reject) => {
        const url = new URL(`${PROMETHEUS_BASE_URL}${path}`);
        const req = http.request(
          {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(body),
            },
          },
          (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => (data += chunk.toString()));
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                resolve(data);
              } else {
                reject(
                  new Error(
                    `Prometheus returned ${String(res.statusCode)}: ${data.substring(0, 200)}`,
                  ),
                );
              }
            });
          },
        );
        req.setTimeout(PrometheusService.REQUEST_TIMEOUT_MS, () => {
          req.destroy(new Error('Request timeout'));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });

    for (let attempt = 0; attempt <= PrometheusService.MAX_RETRIES; attempt++) {
      try {
        return await doRequest();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isTimeout = msg.includes('timeout');
        if (!isTimeout || attempt >= PrometheusService.MAX_RETRIES) {
          throw err;
        }
        this.logger.warn(
          `Prometheus request timeout (attempt ${String(attempt + 1)}/${String(PrometheusService.MAX_RETRIES)}), retrying: ${path}`,
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error('Unreachable');
  }

  async instantQuery(query: string): Promise<VectorResult[]> {
    try {
      const raw = await this.rawPost('/api/v1/query', { query });
      const resp = JSON.parse(raw) as PrometheusApiResponse<VectorResult>;
      if (resp.status !== 'success') {
        this.logger.warn(`Prometheus instant query non-success: ${query}`);
        return [];
      }
      return resp.data.result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Prometheus instant query error [${query}]: ${msg}`);
      return [];
    }
  }

  async rangeQuery(
    query: string,
    start: number,
    end: number,
    step: string,
  ): Promise<MatrixResult[]> {
    try {
      const raw = await this.rawPost('/api/v1/query_range', {
        query,
        start: String(start),
        end: String(end),
        step,
      });
      const resp = JSON.parse(raw) as PrometheusApiResponse<MatrixResult>;
      if (resp.status !== 'success') {
        this.logger.warn(`Prometheus range query non-success: ${query}`);
        return [];
      }
      return resp.data.result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Prometheus range query error [${query}]: ${msg}`);
      return [];
    }
  }

  async getScalar(query: string, fallback = 0): Promise<number> {
    const results = await this.instantQuery(query);
    if (results.length === 0) return fallback;
    const val = parseFloat(results[0].value[1]);
    return isNaN(val) ? fallback : val;
  }

  async getModelNames(): Promise<string[]> {
    const results = await this.instantQuery(
      'sum by (model_name) (increase(vllm:request_success_total[1h]))',
    );
    return results
      .map((r: VectorResult) => r.metric.model_name)
      .filter(Boolean);
  }

  extractRangeValues(
    results: MatrixResult[],
  ): Array<{ timestamp: number; value: number }> {
    if (!results.length || !results[0].values) return [];
    return results[0].values.map(([ts, v]: [number, string]) => ({
      timestamp: ts,
      value: parseFloat(v) || 0,
    }));
  }

  extractMultiSeriesValues(
    results: MatrixResult[],
    labelKey: string,
  ): Record<string, Array<{ timestamp: number; value: number }>> {
    const out: Record<string, Array<{ timestamp: number; value: number }>> = {};
    for (const series of results) {
      const key = series.metric[labelKey] || 'unknown';
      out[key] = series.values.map(([ts, v]: [number, string]) => ({
        timestamp: ts,
        value: parseFloat(v) || 0,
      }));
    }
    return out;
  }

  getTimeParams(timeRange: string): {
    rangeStr: string;
    trendStep: string;
    sparkStep: string;
    durationSec: number;
    startTs: number;
    endTs: number;
  } {
    const endTs = Math.floor(Date.now() / 1000);
    let durationSec: number;
    let trendStep: string;
    let sparkStep: string;
    let rangeStr: string;

    switch (timeRange) {
      case '7d':
        durationSec = 7 * 86400;
        rangeStr = '7d';
        trendStep = '6h';
        sparkStep = '1d';
        break;
      case '30d':
        durationSec = 30 * 86400;
        rangeStr = '30d';
        trendStep = '1d';
        sparkStep = '4d';
        break;
      default:
        durationSec = 86400;
        rangeStr = '24h';
        trendStep = '1h';
        sparkStep = '3h';
        break;
    }

    return {
      rangeStr,
      trendStep,
      sparkStep,
      durationSec,
      startTs: endTs - durationSec,
      endTs,
    };
  }
}
