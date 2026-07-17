import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, deleteCategory } from '../api/categoryService';

export default function Categorias() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getCategories().then((r) => setCategories(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
        <Link to="/categorias/nueva" className="btn btn-primary">+ Nueva Categoría</Link>
      </div>
      <div className="search-bar">
        <input placeholder="Buscar categoría..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={c.id}>
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
              <tr><td colSpan="4" className="text-center">No se encontraron categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
