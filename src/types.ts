export type UnitType = 'UBS' | 'UPA' | 'Hospital';
export type DataStatus = 'available' | 'stale' | 'unavailable';
export type QueueLevel = 'low' | 'moderate' | 'high' | 'unknown';

export interface HealthUnit {
  id: string;
  name: string;
  type: UnitType;
  address: string;
  neighborhood: string;
  city: string;
  /** Coordenadas geográficas verificadas da unidade em São Paulo. */
  location: { lat: number; lng: number };
  description: string;
  openingHours: string;
  data: {
    status: DataStatus;
    queueLevel: QueueLevel;
    estimatedWait: { min: number; max: number } | null;
    updatedAt: string | null;
    source: string;
    simulated: boolean;
  };
}
