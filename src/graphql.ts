import { LinearError } from "./errors.js";

const ENDPOINT = "https://api.linear.app/graphql";

interface GraphQLErrorItem {
  message: string;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

export class LinearClient {
  constructor(private readonly apiKey: string) {}

  async query<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: this.apiKey,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch (error) {
      throw new LinearError(`Linear request failed: ${(error as Error).message}`, "HTTP_ERROR");
    }

    const body = (await response.json().catch(() => undefined)) as
      | { data?: T; errors?: GraphQLErrorItem[] }
      | undefined;
    if (!response.ok) {
      throw new LinearError(`Linear returned HTTP ${response.status}`, "HTTP_ERROR", [], body);
    }
    if (body?.errors?.length) {
      throw new LinearError(
        body.errors.map((item) => item.message).join("; "),
        "GRAPHQL_ERROR",
        [],
        body.errors,
      );
    }
    if (!body?.data) throw new LinearError("Linear returned no data", "GRAPHQL_ERROR");
    return body.data;
  }
}
