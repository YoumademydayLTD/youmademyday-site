// A tiny stand-in for D1: each statement's SQL and bound values go to the test's own answer function.
export interface Call { sql: string; args: unknown[]; op: "first" | "run" | "all" }
export type Answer = (call: Call) => unknown;

export function fakeD1(answer: Answer): { db: D1Database; calls: Call[] } {
  const calls: Call[] = [];
  const statement = (sql: string, args: unknown[] = []) => {
    const exec = (op: Call["op"]) => { const call = { sql, args, op }; calls.push(call); return answer(call); };
    return {
      bind: (...values: unknown[]) => statement(sql, values),
      first: async () => exec("first") ?? null,
      run: async () => { exec("run"); return { success: true, meta: {} }; },
      all: async () => ({ results: (exec("all") as unknown[] | undefined) ?? [], success: true, meta: {} }),
    };
  };
  const batch = async (statements: { run: () => Promise<unknown> }[]) => Promise.all(statements.map((s) => s.run()));
  return { db: { prepare: (sql: string) => statement(sql), batch } as unknown as D1Database, calls };
}
