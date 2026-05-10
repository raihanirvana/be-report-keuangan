import { TransactionType } from './transaction-type.enum';

type CategorySummary = {
  color: string;
  icon: string;
  id: string;
  name: string;
};

type WalletSummary = {
  id: string;
  name: string;
};

export type TransactionResponse = {
  amount: number;
  category: CategorySummary | null;
  formattedAmount: string;
  fromWallet: WalletSummary | null;
  id: string;
  note: string | null;
  occurredAt: string;
  title: string;
  toWallet: WalletSummary | null;
  type: TransactionType;
  wallet: WalletSummary | null;
};
