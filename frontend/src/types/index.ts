export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export interface GroupMember {
  user_id: string;
  user: User;
  joined_at: string;
}

export interface Group {
  id: string;
  name: string;
  image_url: string | null;
  created_by: string;
  created_at: string;
  members: GroupMember[];
}

export interface ExpenseSplit {
  id: string;
  user_id: string;
  amount_owed: number;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  amount: number;
  paid_by: string;
  split_type: 'equal' | 'unequal' | 'percentage' | 'share';
  created_by: string;
  created_at: string;
  splits: ExpenseSplit[];
}

export interface BalanceEntry {
  user_id: string;
  name: string;
  net_amount: number;
}

export interface Payment {
  id: string;
  group_id: string;
  paid_by: string;
  paid_to: string;
  amount: number;
  note?: string;
  created_at: string;
}

export interface Message {
  id: string;
  expense_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface GlobalDashboard {
  total_balance: number;
  total_owed_to_me: number;
  total_i_owe: number;
}
