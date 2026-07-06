import { describe, expect, it } from "vitest";
import { EmailAlreadyRegisteredError, RegisterUser } from "./RegisterUser.js";
import { FakePasswordHasher, InMemoryUserRepository } from "./testFakes.js";

function setup() {
  const users = new InMemoryUserRepository();
  const registerUser = new RegisterUser(users, new FakePasswordHasher());
  return { users, registerUser };
}

describe("RegisterUser", () => {
  it("creates a new user with a hashed (non-plaintext) password", async () => {
    const { registerUser } = setup();

    const user = await registerUser.execute({
      email: "Alice@Example.com",
      password: "correct horse battery staple",
      displayName: "Alice",
    });

    expect(user.email).toBe("alice@example.com"); // normalized
    expect(user.passwordHash).not.toBe("correct horse battery staple");
    expect(user.passwordHash).toContain("hashed:");
  });

  it("rejects a second registration with the same email, case-insensitively", async () => {
    const { registerUser } = setup();
    await registerUser.execute({ email: "bob@example.com", password: "p", displayName: "Bob" });

    await expect(
      registerUser.execute({ email: "BOB@EXAMPLE.COM", password: "p2", displayName: "Bob2" }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it("trims whitespace from the display name", async () => {
    const { registerUser } = setup();
    const user = await registerUser.execute({ email: "c@example.com", password: "p", displayName: "  Carol  " });
    expect(user.displayName).toBe("Carol");
  });
});
