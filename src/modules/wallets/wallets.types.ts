import { WalletType } from './wallet-type.enum';

export type WalletResponse = {
  balance: number;
  color: string;
  formattedBalance: string;
  icon: string;
  id: string;
  name: string;
  type: WalletType;
};
