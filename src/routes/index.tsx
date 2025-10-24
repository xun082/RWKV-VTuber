import { createHashRouter } from "react-router-dom";
import App from "../App";
import ChatPage from "../pages/chat/index";
import ConfigLayoutPage from "../pages/config/layout/index";
import ConfigServicePage from "../pages/config/service/index";
import MemoryPage from "../pages/memory/index";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
      {
        path: "memory",
        element: <MemoryPage />,
      },
      {
        path: "chat",
        element: <ChatPage />,
      },
      {
        path: "config/main",
        element: <ConfigServicePage />,
      },
      {
        path: "config/service",
        element: <ConfigServicePage />,
      },
      {
        path: "config/layout",
        element: <ConfigLayoutPage />,
      },
    ],
  },
]);
