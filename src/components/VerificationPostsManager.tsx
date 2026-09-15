import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Plus, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react';

interface VerificationPost {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  active: boolean;
  created_at: string;
}

export default function VerificationPostsManager() {
  const [posts, setPosts] = useState<VerificationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPost, setNewPost] = useState({ name: '', code: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('verification_posts')
      .select('*')
      .order('name', { ascending: true });
    if (error) setError(error.message);
    else setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.name.trim()) return;

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('verification_posts').insert({
      name: newPost.name.trim(),
      code: newPost.code.trim() || null,
      description: newPost.description.trim() || null,
      active: true,
    });

    if (error) {
      setError(error.message);
    } else {
      setNewPost({ name: '', code: '', description: '' });
      setShowAddForm(false);
      await fetchPosts();
    }
    setSaving(false);
  };

  const toggleActive = async (post: VerificationPost) => {
    const { error } = await supabase
      .from('verification_posts')
      .update({ active: !post.active })
      .eq('id', post.id);
    if (error) setError(error.message);
    else await fetchPosts();
  };

  const deletePost = async (post: VerificationPost) => {
    if (!confirm(`Delete "${post.name}"? This cannot be undone.`)) return;
    const { error } = await supabase
      .from('verification_posts')
      .delete()
      .eq('id', post.id);
    if (error) setError(error.message);
    else await fetchPosts();
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>Verification Posts</span>
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Add Post</span>
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Posts appear in the dropdown on the public verification page. Officers select their assigned post so each verification is logged with a specific location.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAdd} className="mb-4 p-4 bg-white rounded-lg border border-blue-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Post name * (e.g., Main Gate 1)"
              value={newPost.name}
              onChange={(e) => setNewPost({ ...newPost, name: e.target.value })}
              required
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Short code (e.g., MG-01)"
              value={newPost.code}
              onChange={(e) => setNewPost({ ...newPost, code: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newPost.description}
            onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewPost({ name: '', code: '', description: '' }); }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newPost.name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Post'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-6 text-center text-gray-500 text-sm">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm bg-white rounded-lg">
          No posts yet. Click "Add Post" to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                post.active ? 'bg-white border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'
              }`}
            >
              <MapPin className={`h-4 w-4 flex-shrink-0 ${post.active ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-gray-900 truncate">{post.name}</p>
                  {post.code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                      {post.code}
                    </span>
                  )}
                  {!post.active && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded">
                      inactive
                    </span>
                  )}
                </div>
                {post.description && (
                  <p className="text-xs text-gray-500 truncate">{post.description}</p>
                )}
              </div>
              <button
                onClick={() => toggleActive(post)}
                title={post.active ? 'Deactivate' : 'Activate'}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              >
                {post.active ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
              </button>
              <button
                onClick={() => deletePost(post)}
                title="Delete"
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}