/* eslint-disable no-unused-vars */
import "./App.css";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import { useRef, useMemo, useState, useEffect } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";

function App() {
  const [username, setUserName] = useState(() => {
    return new URLSearchParams(window.location.search).get("username") || "";
  });

  const [users, setUsers] = useState([]);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const editorRef = useRef(null);

  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText("monaco"), [ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;
    setIsEditorReady(true);
  };

  useEffect(() => {
    if (username && editorRef.current) {
      const provider = new SocketIOProvider(
        "/",
        "monaco",
        ydoc,
        { autoConnect: true },
      );

      provider.awareness.setLocalStateField("user", { username });

      const monacoBinding = new MonacoBinding(
        yText,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness, // ✅ THIS IS REQUIRED
      );

      // users list
      const updateUsers = () => {
        const states = Array.from(provider.awareness.getStates().values());
        setUsers(states.filter((s) => s?.user?.username).map((s) => s.user));
      };

      updateUsers();
      provider.awareness.on("change", updateUsers);

      function handleBeforeUnload() {
        provider.awareness.setLocalStateField("user", null);
      }

      window.addEventListener("beforeunload", handleBeforeUnload);

      return () => {
        monacoBinding.destroy(); // ✅ important
        provider.disconnect();
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [username, isEditorReady]);

  const handleJoin = (e) => {
    e.preventDefault();
    setUserName(e.target.username.value);
    window.history.pushState({}, "", `?username=${e.target.username.value}`);
  };

  if (!username) {
    return (
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4 items-center justify-center">
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Enter your username..."
            className="bg-gray-800 text-white placeholder:text-gray-500 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="username"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Join
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      <main className="h-screen w-full bg-gray-950 flex gap-4 p-4">
        <aside className="h-full w-1/4 bg-amber-50 rounded-lg ">
          <h2 className="text-2xl font-bold p-4 border-b border-gray-300">
            Users
          </h2>
          <ul>
            {users.map((user, index) => (
              <li key={index} className="p-2 bg-gray-800 text-white mb-2">
                {user.username}
              </li>
            ))}
          </ul>
        </aside>
        <section className="w-3/4 bg-neutral-800 rounded-lg overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            defaultValue="// some coment"
            theme="vs-dark"
            onMount={handleMount}
          />
        </section>
      </main>
    </>
  );
}

export default App;
