import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOrganizationHierarchy } from './organization';

const responseBody = {
  data: {
    branches: [],
    departments: [],
    personas: [],
  },
  meta: {
    requestId: 'req-test',
    timestamp: '2026-09-19T00:00:00.000Z',
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getOrganizationHierarchy', () => {
  it('uses the versioned API transport without a client-controlled organization selector', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(getOrganizationHierarchy({ limit: 25, status: 'active' })).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:4000/api/v1/organization/hierarchy?limit=25&status=active');
    expect(url).not.toMatch(/tenant|organizationId/i);
    expect(init.method).toBe('GET');
    expect(init.cache).toBe('no-store');
    expect(init.credentials).toBe('include');
  });

  it.each([0, 101, 1.5, Number.NaN])('rejects an invalid limit before issuing a request: %s', async (limit) => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(() => getOrganizationHierarchy({ limit })).toThrow(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
