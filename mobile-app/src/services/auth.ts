import { Platform } from "react-native";

export type RegisterPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export type RegisteredUser = RegisterPayload & {
  id: number | string;
  createdAt: string;
};

const DEFAULT_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:3001" : "http://localhost:3001";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super("Account already exists for this email.");
    this.name = "AccountAlreadyExistsError";
  }
}

export async function registerUser(payload: RegisterPayload): Promise<RegisteredUser> {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const existingUserResponse = await fetch(
    `${API_BASE_URL}/users?email=${encodeURIComponent(normalizedEmail)}`,
  );

  if (!existingUserResponse.ok) {
    throw new Error("Could not verify existing account.");
  }

  const existingUsers = (await existingUserResponse.json()) as RegisteredUser[];

  if (existingUsers.length > 0) {
    throw new AccountAlreadyExistsError();
  }

  const createResponse = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      phone: payload.phone.trim(),
      password: payload.password,
      createdAt: new Date().toISOString(),
    }),
  });

  if (!createResponse.ok) {
    throw new Error("Could not create account.");
  }

  return (await createResponse.json()) as RegisteredUser;
}
