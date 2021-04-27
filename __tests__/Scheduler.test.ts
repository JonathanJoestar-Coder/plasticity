import { Scheduler } from "../src/util/Scheduler";

const sentinel = "hi mom";
const concurrency = 2;
const depth = 1;
let scheduler: Scheduler<string>;

beforeEach(() => {
    scheduler = new Scheduler<string>(concurrency, depth);
});

test('schedules work', async () => {
    let resolve;
    const p = new Promise<string>((r,) => {
        resolve = r;
    });
    scheduler.schedule(() => p);
    resolve(sentinel);
    const result = await p;
    expect(result).toBe(sentinel);
});

test('schedules work up to max concurrency', async () => {
    const resolves = [];
    scheduler.schedule(() => new Promise<string>((r,) => { resolves.push(r) }));
    scheduler.schedule(() => new Promise<string>((r,) => { resolves.push(r) }));
    scheduler.schedule(() => new Promise<string>((r,) => { resolves.push(r) }));
    scheduler.schedule(() => new Promise<string>((r,) => { resolves.push(r) }));

    expect(resolves.length).toBe(concurrency);

    resolves[0](sentinel + 0);
    await Promise.resolve();
    expect(resolves.length).toBe(concurrency+1);

    resolves[1](sentinel + 1);
    await Promise.resolve();
    expect(resolves.length).toBe(concurrency+1);

    resolves[2](sentinel + 1);
    await Promise.resolve();
    expect(resolves.length).toBe(concurrency+1);
});
