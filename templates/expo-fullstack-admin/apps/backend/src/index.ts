/**
 * GraphQL Server
 */
import { ApolloServer } from "@apollo/server";
import Fastify from "fastify";

const typeDefs = `
  type Query {
    hello: String
  }
`;

const resolvers = {
    Query: {
        hello: () => "Hello from GraphQL!",
    },
};

async function startServer() {
    const fastify = Fastify({ logger: true });

    const server = new ApolloServer({
        typeDefs,
        resolvers,
    });

    await server.start();

    fastify.get("/health", async () => ({ status: "OK" }));

    const port = 4000;

    try {
        await fastify.listen({ port, host: "0.0.0.0" });
        console.log(`🚀 Server ready at http://localhost:${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

startServer();
