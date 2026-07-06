import "fastify";
import "@fastify/jwt";

interface JwtUserPayload {
  sub: string;
  email: string;
  isAdmin: boolean;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}
