import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "@/stores/auth";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAccess, RequireAuth } from "@/components/layout/guards";
import { Toasts } from "@/components/common/Toasts";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { Orders } from "@/pages/Orders";
import { OrderDetail } from "@/pages/OrderDetail";
import { Inventory } from "@/pages/Inventory";
import { Production } from "@/pages/Production";
import { Reports } from "@/pages/Reports";
import { Users } from "@/pages/Users";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/orders"
            element={
              <RequireAccess roles={["admin", "supervisor", "operator"]}>
                <Orders />
              </RequireAccess>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <RequireAccess roles={["admin", "supervisor", "operator"]}>
                <OrderDetail />
              </RequireAccess>
            }
          />
          <Route path="/inventory" element={<Inventory />} />
          <Route
            path="/production"
            element={
              <RequireAccess roles={["admin", "supervisor", "operator"]}>
                <Production />
              </RequireAccess>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAccess roles={["admin", "supervisor", "viewer"]}>
                <Reports />
              </RequireAccess>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAccess roles={["admin"]}>
                <Users />
              </RequireAccess>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toasts />
    </>
  );
}
