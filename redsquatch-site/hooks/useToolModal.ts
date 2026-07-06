'use client';

import { useCallback, useEffect, useState } from 'react';

export type ToolName = 'grampsweb' | 'stirling';

const STORAGE_KEY = 'redsquatch:lastTool';

interface UseToolModalResult {
  open: boolean;
  tool: ToolName | null;
  openTool: (name: ToolName) => void;
  closeTool: () => void;
}

export function useToolModal(): UseToolModalResult {
  const [tool, setTool] = useState<ToolName | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'grampsweb' || stored === 'stirling') {
      setTool(stored);
    }
  }, []);

  const openTool = useCallback((name: ToolName) => {
    setTool(name);
    setOpen(true);
    window.localStorage.setItem(STORAGE_KEY, name);
  }, []);

  const closeTool = useCallback(() => {
    setOpen(false);
  }, []);

  return { open, tool, openTool, closeTool };
}
