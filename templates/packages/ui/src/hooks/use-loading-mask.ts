"use client";

import { atom, useAtomValue, useSetAtom } from "jotai";
import { useCallback } from "react";

type LoadingMaskState = {
  open: boolean;
  message?: string;
};

const loadingMaskAtom = atom<LoadingMaskState>({ open: false });

export function useLoadingMask() {
  const setState = useSetAtom(loadingMaskAtom);

  const show = useCallback(
    (message?: string) => {
      setState({ open: true, message });
    },
    [setState]
  );

  const hide = useCallback(() => {
    setState({ open: false, message: undefined });
  }, [setState]);

  return { show, hide };
}

export function useLoadingMaskState() {
  return useAtomValue(loadingMaskAtom);
}
