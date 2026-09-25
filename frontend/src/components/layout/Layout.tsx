import { Outlet } from "react-router-dom";
import { WorkspaceProvider } from "../../contexts/WorkspaceContext";
import { NavBar } from "./NavBar";

/**
 * Application frame. The workspace provider wraps the chrome as well as the
 * outlet, so the top bar can show which document is loaded without the
 * workspace having to duplicate that identity inside the stage.
 */
export function Layout() {
  return (
    <WorkspaceProvider>
      <div className="flex min-h-svh flex-col bg-canvas text-ink">
        <NavBar />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </WorkspaceProvider>
  );
}
