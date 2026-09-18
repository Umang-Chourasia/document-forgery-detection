import { Outlet } from "react-router-dom";
import { NavBar } from "./NavBar";

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col bg-canvas text-ink">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
