import { supabase } from './supabase';
import { Bus, SchedulerConfig } from './scheduler/types';
import { DEFAULT_CONFIG } from './scheduler/defaults';

// ==========================================
// BUSES
// ==========================================

export async function fetchBuses(): Promise<Bus[]> {
  // Try Supabase first
  const { data, error } = await (supabase as any)
    .from('buses')
    .select('*')
    .order('id', { ascending: true });
 
  if (!error && data) {
    // If we got data (even empty), and we have a local record, 
    // it means the system is initialized.
    if (data.length > 0) return data as Bus[];
    if (local) return []; // Table is empty but we have local storage record, so empty is intentional
  }

  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error('Error parsing local fleet:', e);
    }
  }

  // Only return null if we have absolutely nothing
  return null;
}
 
export async function saveBus(bus: Bus): Promise<boolean> {
  // Save to LocalStorage first (reliable local fallback)
  const current = await fetchBuses();
  const existingIdx = current.findIndex(b => b.id === bus.id);
  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = bus;
  } else {
    updated = [...current, bus];
  }
  localStorage.setItem('bus-scheduler-fleet', JSON.stringify(updated));

  // Then try Supabase
  const { error } = await (supabase as any)
    .from('buses')
    .upsert(bus);
 
  if (error) {
    console.error('Error saving bus to Supabase:', error);
    // We return true because it saved to LocalStorage at least
    return true; 
  }
  return true;
}

export async function saveFleet(buses: Bus[]): Promise<boolean> {
  localStorage.setItem('bus-scheduler-fleet', JSON.stringify(buses));
  
  // To handle deletions, we must remove buses from DB that are not in our new list.
  // The simplest way for this app is to clear the table and re-insert, 
  // or delete where id is not in the new list.
  // Since we want the DB to match our local state exactly:
  try {
    // Delete all current buses to ensure the list is exactly what we have now
    await (supabase as any).from('buses').delete().neq('id', '_root_'); // common trick to delete all if RLS allows
    
    if (buses.length > 0) {
      const { error } = await (supabase as any)
        .from('buses')
        .insert(buses);
      return !error;
    }
    return true;
  } catch (e) {
    console.error('Error syncing fleet to Supabase:', e);
    return true; // Still return true because LocalStorage is updated
  }
}

// ==========================================
// CONFIGURATION
// ==========================================

export async function fetchConfig(): Promise<SchedulerConfig> {
  // Try Supabase
  const { data, error } = await (supabase as any)
    .from('config')
    .select('*')
    .limit(1)
    .single();
 
  if (!error && data) {
    return data as SchedulerConfig;
  }

  // Fallback to LocalStorage
  const local = localStorage.getItem('bus-scheduler-config');
  if (local) {
    try {
      return JSON.parse(local);
    } catch (e) {
      console.error('Error parsing local config:', e);
    }
  }
 
  return DEFAULT_CONFIG;
}
 
export async function saveConfig(config: SchedulerConfig): Promise<boolean> {
  localStorage.setItem('bus-scheduler-config', JSON.stringify(config));

  const { error } = await (supabase as any)
    .from('config')
    .upsert({ id: 1, ...config }); 
 
  return !error;
}
