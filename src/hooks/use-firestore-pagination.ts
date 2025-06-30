
"use client";

import { useState, useCallback, useEffect } from 'react';
import {
  type Query,
  getDocs,
  startAfter,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';

interface UseFirestorePagination<T> {
  docs: T[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

const safeDateToISOString = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString();
    if (typeof dateValue.toDate === 'function') return dateValue.toDate().toISOString();
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) return date.toISOString();
    return new Date().toISOString();
};


export function useFirestorePagination<T extends { id: string, date: string }>(
  baseQuery: Query<DocumentData> | null,
  pageSize: number = 20
): UseFirestorePagination<T> {
  const [docs, setDocs] = useState<T[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const fetchData = useCallback(async (currentLastDoc: QueryDocumentSnapshot<DocumentData> | null = null, isReload: boolean = false) => {
    if (!baseQuery) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let q = baseQuery;
      if (currentLastDoc) {
        q = limit(q, pageSize);
        q = startAfter(q, currentLastDoc);
      } else {
        q = limit(q, pageSize);
      }

      const documentSnapshots = await getDocs(q);
      const newDocs = documentSnapshots.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: safeDateToISOString(doc.data().date)
      })) as T[];

      setDocs(prevDocs => isReload ? newDocs : [...prevDocs, ...newDocs]);
      setHasMore(newDocs.length === pageSize);
      setLastDoc(documentSnapshots.docs[documentSnapshots.docs.length - 1] || null);
    } catch (error) {
      console.error("Error fetching paginated data:", error);
    } finally {
      setLoading(false);
    }
  }, [baseQuery, pageSize]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchData(lastDoc);
    }
  }, [loading, hasMore, lastDoc, fetchData]);
  
  const reload = useCallback(() => {
      setDocs([]);
      setLastDoc(null);
      setHasMore(true);
      fetchData(null, true);
  }, [fetchData]);

  useEffect(() => {
    // Initial fetch
    if(baseQuery) {
       reload();
    }
  }, [baseQuery, reload]);

  return { docs, loading, hasMore, loadMore, reload };
}
