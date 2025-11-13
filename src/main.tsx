import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./tailwind.css";
import { router } from "./routes/index.tsx";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

// StrictMode 在开发环境会导致组件挂载两次，可能造成 Live2D 重复加载
// 我们已经在代码中添加了防护，但为了确保不出问题，这里移除 StrictMode
createRoot(root).render(<RouterProvider router={router} />);
