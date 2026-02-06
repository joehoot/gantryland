import { describe, expect, it, vi } from "vitest";
import { buildPath, createRouteTask, matchRoute } from "../index";

describe("matchRoute", () => {
  it("matches params and decodes path segments", () => {
    const match = matchRoute("/users/:id", "/users/abc%20123");
    expect(match).toEqual({
      params: { id: "abc 123" },
      path: "/users/abc%20123",
    });
  });

  it("returns null when path params cannot be decoded", () => {
    expect(matchRoute("/users/:id", "/users/%E0%A4%A")).toBeNull();
  });

  it("returns null when segments differ", () => {
    expect(matchRoute("/users/:id", "/teams/1")).toBeNull();
    expect(matchRoute("/users/:id", "/users/1/extra")).toBeNull();
  });
});

describe("buildPath", () => {
  it("builds paths and encodes params", () => {
    const path = buildPath("/users/:id", { id: "a b" });
    expect(path).toBe("/users/a%20b");
  });

  it("throws when a param is missing", () => {
    expect(() => buildPath("/users/:id", {})).toThrow(
      "Missing route param: id",
    );
  });
});

describe("createRouteTask", () => {
  it("runs with current params and exposes helpers", async () => {
    const taskForParams = vi.fn(
      (params: Record<string, string>) => async () =>
        params.id ? `user:${params.id}` : "none",
    );

    const routeTask = createRouteTask(taskForParams, { id: "1" });
    expect(routeTask.getParams()).toEqual({ id: "1" });

    await routeTask.run();
    expect(taskForParams).toHaveBeenCalledWith({ id: "1" });
    expect(routeTask.task.getState().data).toBe("user:1");

    await routeTask.run({ id: "2" });
    expect(routeTask.task.getState().data).toBe("user:2");

    const params = routeTask.getParams();
    params.id = "mutated";
    expect(routeTask.getParams()).toEqual({ id: "2" });
  });

  it("runs with params matched from a route", async () => {
    const taskForParams = (params: Record<string, string>) => async () =>
      params.id ? `user:${params.id}` : "none";

    const routeTask = createRouteTask(taskForParams);
    const match = matchRoute("/users/:id", "/users/9");

    if (!match) {
      throw new Error("expected route to match");
    }

    await routeTask.run(match.params);
    expect(routeTask.task.getState().data).toBe("user:9");
  });
});
