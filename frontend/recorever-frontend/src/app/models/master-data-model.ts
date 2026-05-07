export type MasterDataTab = 'categories' | 'programs';

export type MasterDataItem = {
  id: number;
  name: string;
  code?: string; 
};

export type SortColumn = 'code' | 'name' | null;
export type SortDirection = 'asc' | 'desc';