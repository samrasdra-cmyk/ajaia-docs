import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';

const configuredApiUrl = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000' : 'https://ajaia-docs-1-se5l.onrender.com')
).replace(/\/$/, '');
const API = configuredApiUrl.endsWith('/api') ? configuredApiUrl : `${configuredApiUrl}/api`;

const getErrorMessage = (error, fallback) => error.response?.data?.error || fallback;
const emptyDocument = { type: 'doc', content: [] };
const parseDocument = content => {
  try {
    const parsed = content ? JSON.parse(content) : emptyDocument;
    return parsed?.type === 'doc' ? parsed : emptyDocument;
  } catch {
    return emptyDocument;
  }
};

const FormatButton = ({ editor, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded border px-2 py-1 text-sm ${active ? 'bg-blue-600 text-white' : 'bg-white hover:bg-blue-50'}`}
    aria-pressed={active}
  >
    {label}
  </button>
);

// ----- Mock Login -----
const Login = ({ onLogin }) => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    axios.get(`${API}/users`).then(res => setUsers(res.data)).catch(() => {
      setError('Could not connect to the backend. Check that the API is running.');
    });
  }, []);
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Choose your user</h1>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
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
const DocList = ({ userId, onSelect, selectedDoc, refresh }) => {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const listRef = React.useRef(null);
  useEffect(() => {
    if (userId) {
      axios.get(`${API}/documents?userId=${userId}`).then(res => {
        setDocs(res.data);
        setError('');
      }).catch(error => setError(getErrorMessage(error, 'Could not load documents.')));
    }
  }, [userId, refresh]);

  const createDoc = async () => {
    try {
      await axios.post(`${API}/documents`, {
        ownerId: userId,
        content: JSON.stringify(emptyDocument)
      });
      refresh();
    } catch (error) {
      setError(getErrorMessage(error, 'Could not create the document.'));
    }
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    form.append('ownerId', userId);
    try {
      await axios.post(`${API}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      e.target.value = '';
      refresh();
    } catch (error) {
      setError(getErrorMessage(error, 'Could not upload the file.'));
    }
  };

  const startEdit = (e, doc) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const saveEdit = (e, docId) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      axios.put(`${API}/documents/${docId}`, { title: editingTitle }).then(() => {
        setEditingId(null);
        refresh();
      });
    }
  };

  const cancelEdit = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const deleteDoc = (e, docId) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this document?')) {
      axios.delete(`${API}/documents/${docId}`).then(() => {
        if (selectedDoc?.id === docId) {
          onSelect(null);
        }
        refresh();
        // Scroll to top
        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      });
    }
  };

  return (
    <div ref={listRef} className="w-72 bg-gray-50 border-r p-4 h-screen overflow-auto">
      <button onClick={createDoc} className="w-full bg-blue-600 text-white p-2 rounded mb-2">+ New Document</button>
      <label className="w-full block bg-green-600 text-white p-2 rounded text-center cursor-pointer mb-4">
        Upload .txt
        <input type="file" accept=".txt" onChange={uploadFile} className="hidden" />
      </label>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {docs.map(d => (
        <div key={d.id} className="mb-2 border-b">
          {editingId === d.id ? (
            <div className="flex gap-2 p-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={editingTitle}
                onChange={e => setEditingTitle(e.target.value)}
                className="flex-1 px-2 py-1 border rounded text-sm"
                autoFocus
              />
              <button
                onClick={e => saveEdit(e, d.id)}
                className="bg-green-500 text-white px-2 py-1 rounded text-sm hover:bg-green-600"
              >
                ✓
              </button>
              <button
                onClick={cancelEdit}
                className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 hover:bg-gray-200 cursor-pointer group">
              <div onClick={() => onSelect(d)} className="flex-1 truncate">
                {d.title}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={e => startEdit(e, d)}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs opacity-0 group-hover:opacity-100 hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={e => deleteDoc(e, d.id)}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs opacity-0 group-hover:opacity-100 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ----- Toolbar -----
const Toolbar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex gap-2 mb-4 p-4 bg-gray-100 border rounded flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`px-3 py-2 rounded text-sm font-semibold ${editor.isActive('bold') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`px-3 py-2 rounded text-sm font-italic ${editor.isActive('italic') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>

      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`px-3 py-2 rounded text-sm underline ${editor.isActive('underline') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Underline (Ctrl+U)"
      >
        U
      </button>

      <div className="border-l border-gray-300"></div>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`px-3 py-2 rounded text-sm font-bold ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Heading 1"
      >
        H1
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`px-3 py-2 rounded text-sm font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Heading 2"
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`px-3 py-2 rounded text-sm font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Heading 3"
      >
        H3
      </button>

      <div className="border-l border-gray-300"></div>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`px-3 py-2 rounded text-sm ${editor.isActive('bulletList') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Bullet List"
      >
        • List
      </button>

      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`px-3 py-2 rounded text-sm ${editor.isActive('orderedList') ? 'bg-blue-600 text-white' : 'bg-white border hover:bg-gray-50'}`}
        title="Ordered List"
      >
        1. List
      </button>
    </div>
  );
};

// ----- Editor -----
const Editor = ({ doc, refresh, onDeleted }) => {
  const [title, setTitle] = useState(doc?.title || '');
  const [users, setUsers] = useState([]);
  const [targetUserId, setTargetUserId] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    axios.get(`${API}/users`).then(res => setUsers(res.data)).catch(() => {
      setMessage('Could not load users for sharing.');
    });
  }, []);

  const share = async () => {
    if (!targetUserId) return;
    try {
      await axios.post(`${API}/documents/${doc.id}/share`, { targetUserId: Number(targetUserId) });
      setMessage('Document shared.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not share the document.'));
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`${API}/documents/${doc.id}`);
      onDeleted();
      refresh();
    } catch (error) {
      setMessage(getErrorMessage(error, 'Could not delete the document.'));
    }
  };

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: parseDocument(doc?.content),
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      axios.put(`${API}/documents/${doc.id}`, { content: json }).catch(() => {
        setMessage('Could not save the latest changes.');
      });
    },
  });

  const rename = () => {
    if (title !== doc.title) {
      axios.put(`${API}/documents/${doc.id}`, { title }).then(refresh).catch(error => {
        setMessage(getErrorMessage(error, 'Could not rename the document.'));
      });
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        onBlur={rename}
        className="text-3xl font-bold w-full border-b border-gray-300 mb-4 focus:outline-none"
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={targetUserId} onChange={event => setTargetUserId(event.target.value)} className="border rounded p-2">
          <option value="">Share with...</option>
          {users.filter(user => user.id !== doc.owner_id).map(user => (
            <option key={user.id} value={user.id}>{user.name}</option>
          ))}
        </select>
        <button type="button" onClick={share} className="rounded bg-blue-600 px-3 py-2 text-white">Share</button>
        <button type="button" onClick={remove} className="rounded border border-red-300 px-3 py-2 text-red-700">Delete</button>
        {message && <span className="text-sm text-gray-500">{message}</span>}
      </div>
      {editor && (
        <div className="mb-3 flex flex-wrap gap-2 border-b pb-3" aria-label="Text formatting">
          <FormatButton editor={editor} label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} />
          <FormatButton editor={editor} label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <FormatButton editor={editor} label="Strike" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <FormatButton editor={editor} label="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <FormatButton editor={editor} label="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <FormatButton editor={editor} label="Bullets" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <FormatButton editor={editor} label="Numbers" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <FormatButton editor={editor} label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <FormatButton editor={editor} label="Code" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
        </div>
      )}
      <Toolbar editor={editor} />
      <div className="border rounded p-4 min-h-[70vh] max-w-none prose prose-sm max-w-none">
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
      <DocList userId={user.id} onSelect={setSelectedDoc} selectedDoc={selectedDoc} refresh={refresh} />
      {selectedDoc ? (
        <Editor key={selectedDoc.id} doc={selectedDoc} refresh={refresh} onDeleted={() => setSelectedDoc(null)} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">Select or create a document</div>
      )}
    </div>
  );
};

export default App;
