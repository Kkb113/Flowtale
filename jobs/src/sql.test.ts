import { executeQuery } from './sql';
import { getApiConnection } from './db';

jest.mock('./db', () => ({ getApiConnection: jest.fn() }));

it('holds a pooled connection until its query completes', async () => {
  let complete!: (result: unknown) => void;
  const connection = {
    query: jest.fn(() => new Promise(resolve => { complete = resolve; })),
    release: jest.fn(),
  };
  (getApiConnection as jest.Mock).mockResolvedValue(connection);
  const query = executeQuery<{ value: number }>('SELECT 1 AS value');
  await Promise.resolve();
  expect(connection.release).not.toHaveBeenCalled();
  complete([[{ value: 1 }], []]);
  await expect(query).resolves.toEqual([{ value: 1 }]);
  expect(connection.release).toHaveBeenCalledTimes(1);
});

it('rejects query failures and releases the connection', async () => {
  const connection = { query: jest.fn().mockRejectedValue(new Error('Database disconnected')), release: jest.fn() };
  (getApiConnection as jest.Mock).mockResolvedValue(connection);
  await expect(executeQuery('SELECT 1')).rejects.toThrow('Database disconnected');
  expect(connection.release).toHaveBeenCalledTimes(1);
});
