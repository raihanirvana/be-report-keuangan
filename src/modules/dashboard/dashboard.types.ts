export type MoneySummary = {
  amount: number;
  formatted: string;
};

export type DashboardSummaryResponse = {
  availablePeriod: {
    maxMonth: string;
    minMonth: string;
  };
  balance: MoneySummary;
  budgetLimit: {
    limitAmount: number;
    percentage: number;
    usedAmount: number;
  };
  chart: {
    categories: Array<{
      amount: number;
      categoryId: string;
      color: string;
      name: string;
      percentage: number;
    }>;
    expenseTotal: number;
  };
  expense: MoneySummary;
  income: MoneySummary;
  latestTransactions: Array<{
    amount: number;
    formattedAmount: string;
    id: string;
    occurredAt: string;
    title: string;
    type: string;
  }>;
  selectedWallet: {
    id: string;
    name: string;
  };
  user: {
    avatarUrl: string | null;
    name: string;
  };
};
