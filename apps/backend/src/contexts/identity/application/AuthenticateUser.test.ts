import { describe, expect, it } from "vitest";
import { AccountBannedError, AuthenticateUser, InvalidCredentialsError } from "./AuthenticateUser.js";
import { RegisterUser } from "./RegisterUser.js";
import { FakePasswordHasher, InMemoryUserRepository } from "./testFakes.js";

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  return {
    users,
    registerUser: new RegisterUser(users, hasher),
    authenticateUser: new AuthenticateUser(users, hasher),
  };
}

describe("AuthenticateUser", () => {
  it("authenticates with correct email/password", async () => {
    const { registerUser, authenticateUser } = setup();
    await registerUser.execute({ email: "dave@example.com", password: "secret123", displayName: "Dave" });

    const user = await authenticateUser.execute({ email: "dave@example.com", password: "secret123" });
    expect(user.email).toBe("dave@example.com");
  });

  it("rejects an incorrect password", async () => {
    const { registerUser, authenticateUser } = setup();
    await registerUser.execute({ email: "erin@example.com", password: "secret123", displayName: "Erin" });

    await expect(
      authenticateUser.execute({ email: "erin@example.com", password: "wrong" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("rejects a non-existent email without revealing that distinction", async () => {
    const { authenticateUser } = setup();
    await expect(
      authenticateUser.execute({ email: "nobody@example.com", password: "whatever" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("rejects a correct password for a banned account", async () => {
    const { users, registerUser, authenticateUser } = setup();
    const user = await registerUser.execute({ email: "frank@example.com", password: "secret123", displayName: "Frank" });
    (await users.findById(user.id))!.isBanned = true;

    await expect(
      authenticateUser.execute({ email: "frank@example.com", password: "secret123" }),
    ).rejects.toThrow(AccountBannedError);
  });
});
