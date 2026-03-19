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

export type SignInPayload = {
  email: string;
  password: string;
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

export class UserDoesNotExistError extends Error {
  constructor() {
    super("User does not exist.");
    this.name = "UserDoesNotExistError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials.");
    this.name = "InvalidCredentialsError";
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

export async function signInUser(payload: SignInPayload): Promise<RegisteredUser> {
  const normalizedEmail = payload.email.trim().toLowerCase();

  const response = await fetch(`${API_BASE_URL}/users?email=${encodeURIComponent(normalizedEmail)}`);

  if (!response.ok) {
    throw new Error("Could not verify account.");
  }

  const users = (await response.json()) as RegisteredUser[];

  if (users.length === 0) {
    throw new UserDoesNotExistError();
  }

  const user = users[0];

  if (user.password !== payload.password) {
    throw new InvalidCredentialsError();
  }

  return user;
}
