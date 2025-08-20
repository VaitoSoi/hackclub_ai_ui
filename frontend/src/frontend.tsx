/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { createBrowserRouter, RouterProvider } from "react-router";
import NewChat from "./pages/NewChat";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import { Toaster } from "sonner";

const router = createBrowserRouter([
    { path: "/", element: <App><NewChat /></App> },
    { path: "/chat/:id", element: <App><Chat /></App> },
    {
        path: "/login", element: <>
            <Toaster /><Login />
        </>
    },
    {
        path: "/signup", element: <>
            <Toaster /><Signup />
        </>
    },
    { path: "/*", element: <App><NotFound /></App> },
]);

const elem = document.getElementById("root")!;
const app = (
    // <StrictMode>
    <RouterProvider router={router} />
    // </StrictMode>
);

if (import.meta.hot) {
    // With hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem));
    root.render(app);
} else {
    // The hot module reloading API is not available in production.
    createRoot(elem).render(app);
}
