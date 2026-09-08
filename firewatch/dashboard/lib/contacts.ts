export interface Contact {
  id: string;
  name: string;
  role: string;
  phone: string;
  active: boolean;
}

export const DEFAULT_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Duty Commander (Primary)', role: 'Field Quick Response Team', phone: '+918600596593', active: true },
  { id: 'c2', name: 'Inspector R. Sharma', role: 'NDRF 5th Battalion (Pune)', phone: '+918600596593', active: true },
  { id: 'c3', name: 'Chief Fire Officer K. Patil', role: 'Pune Municipal Fire Brigade', phone: '+918600596593', active: true },
  { id: 'c4', name: 'DFO Deshmukh', role: 'Maharashtra Forest Dept (Wildfire Response)', phone: '+918600596593', active: true },
];
