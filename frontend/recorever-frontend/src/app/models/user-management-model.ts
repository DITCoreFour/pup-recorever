export type AdminResponse = {
  id: number;
  name: string;
  email: string;
  location: string;
  role: string;
  status: string;
}

export type AdminRegistrationRequest = {
  name: string;
  email: string;
  assignedLocation: string;
  password?: string;
}