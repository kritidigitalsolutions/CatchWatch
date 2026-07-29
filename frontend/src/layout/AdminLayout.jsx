import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";
import "./AdminLayout.css";

export default function AdminLayout() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("cw_theme") || "dark";
  });
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("cw_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const toggleSidebar = () => setShowSidebar(!showSidebar);

  return (
    <div className={`app-shell ${theme}`}>
      <Sidebar
        theme={theme}
        showSidebar={showSidebar}
        toggleSidebar={toggleSidebar}
        closeSidebar={() => setShowSidebar(false)}
      />

      <div className="page-shell">
        <Topbar
          theme={theme}
          toggleTheme={toggleTheme}
          toggleSidebar={toggleSidebar}
        />

        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

