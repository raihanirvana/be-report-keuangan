export type PayrollPeriodResponse = {
  endDate: string;
  id: string;
  isCurrent: boolean;
  label: string;
  name: string;
  startDate: string;
};

export type PeriodRange = {
  budgetKey: string;
  end: Date;
  label: string;
  month?: string;
  periodId?: string;
  start: Date;
};
