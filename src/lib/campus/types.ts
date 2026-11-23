export const roles = ["student", "faculty", "lab_admin", "super_admin"] as const;
export type Role = typeof roles[number];

export interface Actor {
  id: string;
  name: string;
  role: Role;
  department: string;
}

export interface Resource {
  id: string;
  name: string;
  category: string;
  labId: string;
  department: string;
  lab: string;
  location: string;
  manufacturer: string;
  model: string;
  specifications: string;
  capabilities: string[];
  requiresApproval: boolean;
  requiresTraining: boolean;
}

export interface Unit {
  id: string;
  equipmentId: string;
  label: string;
  operational: boolean;
  opens: number;
  closes: number;
  days: number[];
}

export interface Interval {
  unitId: string;
  start: string;
  end: string;
}

export interface Project {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  deadline: string;
  capabilities: string[];
  team: string[];
  memberNames?: Record<string, string>;
  progress: number;
}

export type BookingStatus = "pending_approval" | "confirmed" | "rejected" | "cancelled" | "completed" | "waitlisted";

export interface Reservation extends Interval {
  id: string;
  requesterName?: string;
  ownerId: string;
  projectId: string;
  equipmentId: string;
  purpose: string;
  status: BookingStatus;
  createdAt: string;
  comment?: string;
  decisionBy?: string;
  decidedAt?: string;
  suggestedStart?: string;
  suggestedUnitId?: string;
  suggestedEquipmentId?: string;
  fromWaitlist?: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
}

export interface Certification {
  ownerId: string;
  equipmentId: string;
  expires: string;
}

export interface Notice {
  id: string;
  ownerId: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Campus {
  equipment: Resource[];
  units: Unit[];
  maintenance: Interval[];
  occupied: Interval[];
  projects: Project[];
  requests: Reservation[];
  certifications: Certification[];
  notices: Notice[];
}

export interface Workspace extends Campus {
  actor: Actor;
  demo: boolean;
  asOf: number;
  analyticsRequests: (Pick<Reservation, "id" | "unitId" | "equipmentId" | "start" | "end" | "status" | "fromWaitlist"> & { crossDepartment: boolean })[];
}

export function canReview(actor: Actor, equipment: Resource, ownerId: string) {
  return actor.id !== ownerId && (actor.role === "super_admin" ||
    ((actor.role === "faculty" || actor.role === "lab_admin") && actor.department === equipment.department));
}
