import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const serverUrl = env.VITE_SERVER_URL || "http://localhost:9000";
  const proxyTarget = serverUrl
    .replace(/^wss:\/\//, "https://")
    .replace(/^ws:\/\//, "http://");

  return {
    plugins: [react(), basicSsl()],
    server: {
      host: true,
      proxy: {
        "/notify": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/peerjs": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/stats": {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
