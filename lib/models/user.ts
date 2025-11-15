import clientPromise from "@/lib/db";

export interface User {
  id: string
  name: string
  email: string
  password: string // In a real app, this would be hashed
  phone: string
  role: "farmer" | "doctor" | "admin" | "superadmin"
  status: "active" | "suspended" | "inactive"
  createdAt: Date
  updatedAt: Date
}

export interface FarmerProfile extends User {
  role: "farmer"
  district: string
  sector: string
  animals: string[] // Array of animal IDs
}

export interface DoctorProfile extends User {
  role: "doctor"
  licenseNumber: string
  specialization: string
  availability: {
    days: string[]
    hours: {
      start: string
      end: string
    }
  }
  consultations: string[] // Array of consultation IDs
}

export interface AdminProfile extends User {
  role: "admin"
  permissions: string[]
}

export interface SuperAdminProfile extends User {
  role: "superadmin"
  permissions: string[]
  lastLoginAt?: Date
}

export async function getDoctors() {
  try {
    const client = await clientPromise;
    const db = client.db("ntdm_animal_hospital");
    const doctors = await db.collection("users").find({ role: "doctor" }).toArray();
    return doctors.map(d => ({
      _id: d._id.toString(),
      name: d.name,
      email: d.email,
      specialization: d.specialization || "",
      phone: d.phone || "",
      // add more fields as needed
    }));
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return [];
  }
}
