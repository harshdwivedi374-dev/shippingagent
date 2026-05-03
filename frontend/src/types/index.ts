export interface Address {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface Shipment {
  id: string;
  tracking_number?: string;
  status: string;
  priority: string;
  origin_address: Address;
  destination_address: Address;
  weight_kg: number;
  declared_value: number;
  selected_carrier?: string;
  selected_service?: string;
  quoted_rate?: number;
  agent_confidence_score?: number;
  agent_reasoning?: any[];
  agent_alternatives?: any[];
  auto_executed: boolean;
  carbon_footprint_kg?: number;
  is_green_route: boolean;
  created_at: string;
  estimated_delivery?: string;
}

export interface Escalation {
  id: string;
  shipment_id: string;
  status: string;
  confidence_score: number;
  reason: string;
  option_a?: any;
  option_b?: any;
  option_c?: any;
  agent_reasoning_log?: any;
  expires_at?: string;
  created_at: string;
}

export interface TrackingEvent {
  id: string;
  event_type: string;
  description?: string;
  location?: string;
  occurred_at: string;
}

export interface AgentDecision {
  decision_id: string;
  action: string;
  result: any;
  confidence: number;
  disposition: string;
  reasoning: string;
  alternatives: any[];
}

export interface RateQuote {
  carrier: string;
  service: string;
  rate: number;
  currency: string;
  transit_days?: number;
  provider: string;
}
