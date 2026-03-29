export interface Category {
  clientId: string;
  userEmail: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CategoryChange {
  clientId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}