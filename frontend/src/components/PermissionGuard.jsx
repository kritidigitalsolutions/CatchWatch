import { Navigate } from "react-router-dom";

export default function PermissionGuard({ pageKey, children }) {
  const role = localStorage.getItem("adminRole") || "ADMIN";
  
  // Super admin has unrestricted access to all pages
  if (role === "ADMIN") {
    return children;
  }

  // Subadmins can never access subadmins management page
  if (pageKey === "subadmins") {
    return <Navigate to="/dashboard" replace />;
  }

  // Dashboard home is accessible to all logged-in subadmins
  if (pageKey === "dashboard" || !pageKey) {
    return children;
  }

  let permissions = [];
  try {
    const raw = localStorage.getItem("adminPermissions");
    if (raw) permissions = JSON.parse(raw);
  } catch (e) {
    permissions = [];
  }

  // Check if subadmin has the pageKey directly OR any granular permission like pageKey:view
  const hasAccess =
    permissions.includes(pageKey) ||
    permissions.some((p) => p.startsWith(`${pageKey}:`));

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
