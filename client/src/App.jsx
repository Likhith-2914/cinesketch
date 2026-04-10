import { useEffect, useState } from "react";
import { socket } from "./socket";

function App() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.connect();

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>🎬 CineSketch</h1>
      <p>Server status: {connected ? "✅ Connected" : "⏳ Connecting..."}</p>
    </div>
  );
}

export default App;
