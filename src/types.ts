export interface Client {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  addressCep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  source?: string;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'cutting' | 'sewing' | 'finishing' | 'delivered';

export interface OrderItem {
  templateId: string;
  shirtType: string;
  quantity: number;
  fabricType: string;
  fabricColor: string;
  fabricUsagePerUnit: number;
  totalFabricEstimate: number;
  collarType?: string;
  color?: string;
  collarTemplateId?: string;
  buttonTemplateId?: string;
  unitPrice?: number; // Preço unitário de venda (usado para valor da NF-e)
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerTaxId?: string;
  customerAddress?: string;
  status: OrderStatus;
  statusStartedAt?: any; // Firestore timestamp
  items: OrderItem[];
  deliveryDate: string;
  designImages?: string[]; // Array of base64 strings
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
  photos: string[];
  notes?: string;
  customerPhone?: string;
  isDelayed: boolean;
  nfeIssued: boolean;
}

export type StockType = 'fabric' | 'buttons' | 'collar' | 'thread' | 'label' | 'others';

export interface StockItem {
  id: string;
  name: string;
  type: StockType;
  color?: string;
  size?: string;
  materialFormat?: string;
  quantity: number;
  unit: 'metros' | 'unidades' | 'kg';
  minQuantity: number;
}

export type UserRole = 'super_admin' | 'admin_geral' | 'gerente_producao' | 'gestor_geral' | 'funcionario_padrao';

export interface UserProfile {
  id: string;
  uid: string;
  displayName: string | null;
  email: string | null;
  role: UserRole;
  username?: string;
  tempPassword?: string;
}

export interface FabricTemplate {
  id: string;
  name: string;
  category?: 'camisa' | 'gola' | 'botao';
  fabricConsumption: number;
  buttonConsumption: number;
  collarConsumption: number;
  size?: string;
  style?: string;
  fabricType?: string;
  collarType?: string;
  color?: string;
}
