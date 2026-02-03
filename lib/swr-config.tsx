"use client";

import { SWRConfig } from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw error.error || error.message || '请求失败';
  }
  return res.json();
};

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        dedupingInterval: 5000,
        keepPreviousData: true,
        errorRetryCount: 2,
        errorRetryInterval: 5000,
        shouldRetryOnError: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}

export { fetcher };
