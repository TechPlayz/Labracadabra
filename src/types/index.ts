export type EquipmentCategory =
  | "Microscopy & Imaging"
  | "Spectroscopy & Analysis"
  | "Additive & Prototyping"
  | "Cleanroom & Lithography"
  | "High-Performance Compute"
  | "Robotics & Automation"
  | "Biochemical Analysis";

export type EquipmentStatus = "available" | "in-use" | "maintenance" | "reserved";

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "available" | "booked" | "tentative";
  bookedBy?: string;
}

export interface Supervisor {
  name: string;
  title: string;
  department: string;
  email: string;
  office: string;
  avatar: string;
}

export interface Equipment {
  id: string;
  name: string;
  model: string;
  category: EquipmentCategory;
  department: string;
  building: string;
  room: string;
  status: EquipmentStatus;
  hourlyRate: string; // e.g. "Free for UG Research" or "Tier A"
  rating: number;
  totalBookings: number;
  description: string;
  supervisor: Supervisor;
  specifications: Record<string, string>;
  safetyRequirements: string[];
  supportedSampleTypes: string[];
  slots: TimeSlot[];
  imageUrl?: string;
  isDemo: true;
}

export type BookingStatus =
  | "confirmed"
  | "pending_faculty"
  | "completed"
  | "conflict_resolved"
  | "cancelled";

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  department: string;
  location: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  projectName: string;
  studentName: string;
  studentId: string;
  supervisorName: string;
  conflictResolutionNote?: string;
  fairnessScore?: number;
  isDemo: true;
}

export interface Project {
  id: string;
  title: string;
  leadStudent: string;
  leadEmail: string;
  department: string;
  advisor: string;
  description: string;
  status: "active" | "proposal" | "review" | "completed";
  equipmentAllocated: string[];
  progress: number;
  grantOrCourse: string;
  teamMembers: string[];
  isDemo: true;
}

export interface FacultyApprovalRequest {
  id: string;
  studentName: string;
  studentId: string;
  studentEmail: string;
  projectName: string;
  equipmentId: string;
  equipmentName: string;
  requestedDate: string;
  requestedSlot: string;
  purposeSummary: string;
  alignmentScore: number; // e.g. 96
  safetyCertified: boolean;
  status: "pending" | "approved" | "rejected";
  urgency: "low" | "medium" | "high";
  submittedAt: string;
  isDemo: true;
}

export interface CampusStats {
  totalEquipment: number;
  activeBookingsToday: number;
  departmentsConnected: number;
  averageUtilizationPercent: number;
  conflictsResolvedByAI: number;
  researchHoursFacilitated: number;
  isDemo: true;
}

export interface AssistantMatchResult {
  equipmentId: string;
  equipmentName: string;
  category: EquipmentCategory;
  matchScore: number;
  rationale: string;
  recommendedSlot: string;
  safetyPrerequisite: string;
  location: string;
}
