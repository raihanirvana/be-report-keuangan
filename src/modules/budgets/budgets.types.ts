export type BudgetItemResponse = {
  categoryId: string;
  color: string;
  documentId: string;
  icon: string;
  id: string;
  limitAmount: number;
  name: string;
  percentage: number;
  statusLabel: string;
  usedAmount: number;
};

export type BudgetSummaryResponse = {
  limitAmount: number;
  percentage: number;
  usedAmount: number;
};

export type BudgetsResponse = {
  documentId: string | null;
  items: BudgetItemResponse[];
  month: string;
  period?: {
    endDate: string;
    id: string | null;
    label: string;
    startDate: string;
  };
  previousMonth?: {
    available: boolean;
    month: string;
    periodId?: string;
  };
  summary: BudgetSummaryResponse;
};
