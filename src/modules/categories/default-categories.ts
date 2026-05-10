import { CategoryType } from './category-type.enum';

export const DEFAULT_CATEGORIES = [
  {
    color: '#EE2B6C',
    icon: 'restaurant',
    name: 'Makanan',
    type: CategoryType.Expense,
  },
  {
    color: '#4EA8DE',
    icon: 'two_wheeler',
    name: 'Transport',
    type: CategoryType.Expense,
  },
  {
    color: '#A29BFE',
    icon: 'shopping_bag',
    name: 'Belanja',
    type: CategoryType.Expense,
  },
  {
    color: '#FBCF33',
    icon: 'local_activity',
    name: 'Main/Hobi',
    type: CategoryType.Expense,
  },
  {
    color: '#4EA8DE',
    icon: 'wifi',
    name: 'Internet/Kuota',
    type: CategoryType.Expense,
  },
  {
    color: '#EE2B6C',
    icon: 'home_pin',
    name: 'Kos/Rent',
    type: CategoryType.Expense,
  },
  {
    color: '#A29BFE',
    icon: 'face',
    name: 'Skincare',
    type: CategoryType.Expense,
  },
  {
    color: '#4EA8DE',
    icon: 'payments',
    name: 'Gaji',
    type: CategoryType.Income,
  },
  {
    color: '#A29BFE',
    icon: 'work',
    name: 'Freelance',
    type: CategoryType.Income,
  },
  {
    color: '#FBCF33',
    icon: 'redeem',
    name: 'Hadiah',
    type: CategoryType.Income,
  },
] as const;
