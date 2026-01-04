import React, { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Sidebar } from "./components/layout/Sidebar";
import { Toolbar } from "./components/layout/Toolbar";
import { StatusBar } from "./components/layout/StatusBar";
import { NodeEditor } from "./components/editor/NodeEditor";
import { NodePropertiesPanel } from "./components/editor/panels/NodeProperties";
import { PreviewPanel } from "./components/preview/PreviewPanel";
import { useProjectStore } from "./stores/projectStore";
import "./styles/globals.css";

function App(): React.ReactElement {
  const { project, newProject } = useProjectStore();

  // Create a default project on first load if none exists
  useEffect(() => {
    if (!project) {
      newProject("Untitled Project");
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            if (e.shiftKey) {
              useProjectStore.getState().redo();
            } else {
              useProjectStore.getState().undo();
            }
            e.preventDefault();
            break;
          case "y":
            useProjectStore.getState().redo();
            e.preventDefault();
            break;
          case "s":
            useProjectStore.getState().saveProject();
            e.preventDefault();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-bg-primary text-text-primary overflow-hidden">
        <Toolbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex overflow-hidden">
            <NodeEditor />
            <NodePropertiesPanel />
            <PreviewPanel />
          </main>
        </div>
        <StatusBar />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
