import { supabase } from './supabase';
import { Bus, SchedulerConfig } from './scheduler/types';
import { DEFAULT_CONFIG } from './scheduler/defaults';

// ==========================================
// BUSES
// ==========================================

export async function fetchBuses(): Promise<Bus[]> {
  // TODO: Create a 'buses' table in Supabase with columns matching the Bus type
  const { data, error } = await supabase
    .from('buses' as any) // Using 'as any' temporarily until types are re-generated with the table
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching buses:', error);
    return [];
  }

  return data as Bus[];
}

export async function saveBus(bus: Bus): Promise<boolean> {
  const { error } = await supabase
    .from('buses' as any)
    .upsert(bus);

  if (error) {
    console.error('Error saving bus:', error);
    return false;
  }
  return true;
}

// ==========================================
// CONFIGURATION
// ==========================================

export async function fetchConfig(): Promise<SchedulerConfig> {
  // TODO: Create a 'config' table in Supabase (perhaps a single row table)
  const { data, error } = await supabase
    .from('config' as any)
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    console.warn('Config not found in DB, using default:', error?.message);
    return DEFAULT_CONFIG;
  }

  // Parse JSON columns if necessary (like peakWindows)
  return data as SchedulerConfig;
}

export async function saveConfig(config: SchedulerConfig): Promise<boolean> {
  const { error } = await supabase
    .from('config' as any)
    .upsert({ id: 1, ...config }); // Assuming a single row with id = 1

  if (error) {
    console.error('Error saving config:', error);
    return false;
  }
  return true;
}
