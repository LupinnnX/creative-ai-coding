import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { spawn } from 'child_process';
import { DroidClient } from './droid';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

type SpawnMock = jest.MockedFunction<typeof spawn>;
const spawnMock = spawn as unknown as SpawnMock;

function mockSpawnResult(params: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  error?: NodeJS.ErrnoException;
}): void {
  const child = new EventEmitter() as unknown as ReturnType<typeof spawn> & {
    stdout: PassThrough;
    stderr: PassThrough;
  };

  child.stdout = new PassThrough();
  child.stderr = new PassThrough();

  spawnMock.mockReturnValue(child);

  process.nextTick(() => {
    if (params.error) {
      child.emit('error', params.error);
      return;
    }

    if (params.stderr) child.stderr.write(params.stderr);
    if (params.stdout) child.stdout.write(params.stdout);
    child.stdout.end();
    child.stderr.end();
    child.emit('close', params.exitCode ?? 0);
  });
}

async function collect(gen: AsyncGenerator<unknown>): Promise<unknown[]> {
  const out: unknown[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe('DroidClient', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('yields result + assistant message on success', async () => {
    mockSpawnResult({
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: false,
        result: 'hello from droid',
        session_id: 'sess-123',
      }),
      exitCode: 0,
    });

    const client = new DroidClient({ model: 'glm-4.6' });
    const chunks = await collect(client.sendQuery('hi', '/workspace'));

    expect(chunks).toEqual([
      { type: 'result', sessionId: 'sess-123' },
      { type: 'assistant', content: 'hello from droid' },
    ]);
  });

  test('yields helpful auth guidance on auth errors', async () => {
    mockSpawnResult({
      stdout: JSON.stringify({
        type: 'result',
        subtype: 'error',
        is_error: true,
        result: 'Unauthorized',
        session_id: 'sess-unauth',
      }),
      stderr: 'Error: FACTORY_API_KEY is not set',
      exitCode: 1,
    });

    const client = new DroidClient();
    const chunks = (await collect(client.sendQuery('hi', '/workspace'))) as Array<{
      type: string;
      content?: string;
      sessionId?: string;
    }>;

    expect(chunks[0]?.type).toBe('system');
    expect(chunks[0]?.content).toContain('FACTORY_API_KEY');
    expect(chunks[1]).toEqual({ type: 'result', sessionId: 'sess-unauth' });
    expect(chunks[2]?.type).toBe('assistant');
    expect(chunks[2]?.content).toContain('Auth required');
  });

  test('yields helpful message when droid binary is missing (ENOENT)', async () => {
    const err = Object.assign(new Error('spawn droid ENOENT'), {
      code: 'ENOENT',
    }) as NodeJS.ErrnoException;

    mockSpawnResult({ error: err });

    const client = new DroidClient({ bin: 'droid' });
    const chunks = (await collect(client.sendQuery('hi', '/workspace'))) as Array<{
      type: string;
      content?: string;
    }>;

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.type).toBe('assistant');
    expect(chunks[0]?.content).toContain('Droid CLI not found');
  });

  test('does not throw on malformed JSON output', async () => {
    mockSpawnResult({ stdout: 'not-json', exitCode: 0 });

    const client = new DroidClient();
    const chunks = (await collect(client.sendQuery('hi', '/workspace'))) as Array<{
      type: string;
      content?: string;
    }>;

    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.type).toBe('assistant');
    expect(chunks[0]?.content).toContain('Failed to parse Droid output');
  });
});
