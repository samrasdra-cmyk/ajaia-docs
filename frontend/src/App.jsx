import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const configuredApiUrl = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')).replace(/\/$/, '');
const API = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

// ----- Mock Login -----
const Login = ({ onLogin }) => {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    axios.get(`${API}/users`).then(res => setUsers(res.data));
  }, []);
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Choose your user</h1>
        {users.map(u => (
          <button key={u.id} onClick={() => onLogin(u)} className="block w-full m-2 p-2 border rounded hover:bg-blue-50">
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
};

// ----- Document List -----
const DocList = ({ userId, onSelect, refresh }) => {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    if (userId) {
      axios.get(`${API}/documents?userId=${userId}`).then(res => setDocs(res.data));
    }
  }, [userId, refresh]);

  const createDoc = () => {
    axios.post(`${API}/documents`, { ownerId: userId, content: '{}' }).then(() => refresh());
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('ownerId', userId);
    await axios.post(`${API}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    refresh();
  };

  return (
    <div className="w-72 bg-gray-50 border-r p-4 h-screen overflow-auto">
      <button onClick={createDoc} className="w-full bg-blue-600 text-white p-2 rounded mb-2">+ New Document</button>
      <label className="w-full block bg-green-600 text-white p-2 rounded text-center cursor-pointer mb-4">
        Upload .txt
        <input type="file" accept=".txt" onChange={uploadFile} className="hidden" />
      </label>
      {docs.map(d => (
        <div key={d.id} onClick={() => onSelect(d)} className="p-2 hover:bg-gray-200 cursor-pointer truncate border-b">
          {d.title}
        </div>
      ))}
    </div>
  );
};

// ----- Editor -----
const Editor = ({ doc, refresh }) => {
  const [title, setTitle] = useState(doc?.title || '');

  const editor = useEditor({
    extensions: [StarterKit],
    content: doc?.content ? JSON.parse(doc.content) : { type: 'doc', content: [] },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      axios.put(`${API}/documents/${doc.id}`, { content: json });
    },
  });

  const rename = () => {
    if (title !== doc.title) {
      axios.put(`${API}/documents/${doc.id}`, { title }).then(refresh);
    }
  };

  return (
    <div className="flex-1 p-6">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={rename}
        className="text-3xl font-bold w-full border-b border-gray-300 mb-4 focus:outline-none"
      />
      <div className="border rounded p-4 min-h-[70vh] max-w-none">
        <EditorContent editor={editor} />
      </div>
      <div className="mt-2 text-sm text-gray-400">Autosaves while you type</div>
    </div>
  );
};

// ----- Main App -----
const App = () => {
  const [user, setUser] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [refreshToggle, setRefreshToggle] = useState(false);
  const refresh = () => setRefreshToggle(!refreshToggle);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="flex h-screen">
      <DocList userId={user.id} onSelect={setSelectedDoc} refresh={refresh} />
      {selectedDoc ? (
        <Editor key={selectedDoc.id} doc={selectedDoc} refresh={refresh} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">Select or create a document</div>
      )}
    </div>
  );
};

export default App;
