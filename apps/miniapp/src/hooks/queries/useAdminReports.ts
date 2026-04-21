import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export type ReportTimeframe = 'today' | 'week' | 'month' | 'year';

export interface OrderStatusCount {
  status: string;
  count: number;
}

export interface ReportStats {
  timeframe: ReportTimeframe;
  range: { start: string; end: string };
  orders: OrderStatusCount[];
  revenue: {
    total: number;
    discount: number;
  };
  newCustomers: number;
}

export function useAdminReportStats(timeframe: ReportTimeframe) {
  return useQuery<ReportStats>({
    queryKey: ['admin-report-stats', timeframe],
    queryFn: () => api.get(`/reports/stats?timeframe=${timeframe}`) as Promise<ReportStats>,
    staleTime: 60_000,       // 1 daqiqa kesh
    refetchOnWindowFocus: false,
  });
}
