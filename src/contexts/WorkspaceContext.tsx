import React, { createContext, useContext, useState, useEffect } from 'react';

export type Workspace = 'personal' | 'family';

interface WorkspaceContextType {
  workspace: Workspace;
  setWorkspace: (w: Workspace) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: 'personal',
  setWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace>(() => {
    const saved = localStorage.getItem('fintrack_workspace');
    return (saved as Workspace) || 'personal';
  });

  useEffect(() => {
    localStorage.setItem('fintrack_workspace', workspace);
  }, [workspace]);

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
