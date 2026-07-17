import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, deleteCategory, bulkDeleteCategories } from '../api/categoryService';

export default function Categorias() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const load = () => {
    setLoading(true);
    getCategories().then((r) => setCategories(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((c) => c.id));
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`¿Eliminar ${selected.length} categoría(s)?`)) return;
    await bulkDeleteCategories(selected);
    setSelected([]);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await deleteCategory(id);
    load();
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Categorías</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/categorias/nueva" className="btn btn-primary">+ Nueva Categoría</Link>
          {selected.length > 0 && <button className="btn btn-danger" onClick={handleBulkDelete}>🗑 Eliminar {selected.length}</button>}
        </div>
      </div>
      <div className="search-bar">
        <input placeholder="Buscar categoría..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
              <th>N°</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id}>
                <td><input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                <td className="text-muted">{i + 1}</td>
                <td>{c.name}</td>
                <td>{c.description}</td>
                <td className="actions">
                  <Link to={`/categorias/${c.id}/editar`} className="btn btn-sm">Editar</Link>
                  <button onClick={() => handleDelete(c.id)} className="btn btn-sm btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="5" className="text-center">No se encontraron categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
