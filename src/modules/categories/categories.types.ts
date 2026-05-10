import { CategoryType } from './category-type.enum';

export type CategoryResponse = {
  color: string;
  icon: string;
  id: string;
  isDefault: boolean;
  name: string;
  type: CategoryType;
};
