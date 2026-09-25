import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/layout/Layout";
import { Workspace } from "./components/layout/Workspace";
import { AuthProvider } from "./contexts/AuthContext";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { Signup } from "./pages/Signup";

/** Keeps `/analysis/:id` deep links working by forwarding the id to `/w/:id`. */
function AnalysisRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/w/${id}` : "/w"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected — RLS is the real enforcement; this is the UX guard. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/w" element={<Workspace />} />
              <Route path="/w/:id" element={<Workspace />} />

              {/* The previous routes are kept as redirects: existing links,
                  bookmarks and the post-login `from` target all still work. */}
              <Route path="/analyze" element={<Navigate to="/w" replace />} />
              <Route path="/history" element={<Navigate to="/w?pane=history" replace />} />
              <Route path="/analysis/:id" element={<AnalysisRedirect />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
