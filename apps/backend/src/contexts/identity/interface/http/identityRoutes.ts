import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AccountBannedError, AuthenticateUser, InvalidCredentialsError } from "../../application/AuthenticateUser.js";
import { EmailAlreadyRegisteredError, RegisterUser } from "../../application/RegisterUser.js";
import type { PasswordHasherPort } from "../../domain/PasswordHasherPort.js";
import type { UserAccount } from "../../domain/User.js";
import type { UserRepository } from "../../domain/UserRepository.js";

export interface IdentityRoutesDeps {
  users: UserRepository;
  passwordHasher: PasswordHasherPort;
}

interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
}

interface LoginBody {
  email: string;
  password: string;
}

const emailPasswordSchema = {
  type: "object",
  required: ["email", "password"],
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

/**
 * FR-ID-001/FR-ID-002 (Software Requirements Specification): registration,
 * login, and a JWT-protected "who am I" endpoint proving the whole chain
 * (hash -> store -> verify -> sign -> verify-on-request) actually works.
 * Refresh-token rotation and logout (FR-ID-002's "rotating refresh tokens")
 * are deliberately not implemented yet — out of scope for proving auth
 * works end-to-end; tracked as follow-up before this is production-real.
 */
export async function identityRoutes(fastify: FastifyInstance, deps: IdentityRoutesDeps): Promise<void> {
  const registerUser = new RegisterUser(deps.users, deps.passwordHasher);
  const authenticateUser = new AuthenticateUser(deps.users, deps.passwordHasher);

  fastify.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["email", "password", "displayName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8, maxLength: 200 },
            displayName: { type: "string", minLength: 1, maxLength: 50 },
          },
        },
      },
    },
    async (request, reply) => {
      const { email, password, displayName } = request.body as RegisterBody;

      try {
        const user = await registerUser.execute({ email, password, displayName });
        const accessToken = await signAccessToken(reply, user);
        return reply.code(201).send({ user: toPublicUser(user), accessToken });
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
          return reply.code(409).send(problem(409, "email_taken", error.message));
        }
        throw error;
      }
    },
  );

  fastify.post("/auth/login", { schema: { body: emailPasswordSchema } }, async (request, reply) => {
    const { email, password } = request.body as LoginBody;

    try {
      const user = await authenticateUser.execute({ email, password });
      const accessToken = await signAccessToken(reply, user);
      return reply.send({ user: toPublicUser(user), accessToken });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.code(401).send(problem(401, "invalid_credentials", error.message));
      }
      if (error instanceof AccountBannedError) {
        return reply.code(403).send(problem(403, "account_banned", error.message));
      }
      throw error;
    }
  });

  fastify.get(
    "/users/me",
    { preHandler: fastify.authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await deps.users.findById(request.user.sub);
      if (!user) {
        return reply.code(404).send(problem(404, "user_not_found", "User not found"));
      }
      return { user: toPublicUser(user) };
    },
  );
}

async function signAccessToken(reply: FastifyReply, user: UserAccount): Promise<string> {
  return reply.jwtSign({ sub: user.id, email: user.email, isAdmin: user.isAdmin }, { expiresIn: "15m" });
}

function toPublicUser(user: UserAccount) {
  return { id: user.id, email: user.email, displayName: user.displayName, isAdmin: user.isAdmin };
}

function problem(status: number, type: string, detail: string) {
  return { type, title: type, status, detail };
}
