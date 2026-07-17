import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployees, deleteEmployee, bulkDeleteEmployees } from '../api/employeeService';

export default function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState([]);

  const load = () => {
    setLoading(true);
    getEmployees().then((r) => setEmployees(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((e) => e.id));
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`¿Eliminar ${selected.length} empleado(s)?`)) return;
    await bulkDeleteEmployees(selected);
    setSelected([]);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    await deleteEmployee(id);
    load();
  };

  const filtered = employees.filter((e) =>
    e.fullName.toLowerCase().includes(search.toLowerCase()) ||
    (e.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.sede || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Empleados</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link to="/empleados/nuevo" className="btn btn-primary">+ Nuevo Empleado</Link>
          {selected.length > 0 && <button className="btn btn-danger" onClick={handleBulkDelete}>🗑 Eliminar {selected.length}</button>}
        </div>
      </div>
      <div className="search-bar">
        <input placeholder="Buscar empleado por nombre o departamento..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
              <th>N°</th>
              <th>Nombre completo</th>
              <th>Departamento</th>
              <th>Sede</th>
              <th>Puesto</th>
              <th>Equipos asignados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id}>
                <td><input type="checkbox" checked={selected.includes(e.id)} onChange={() => toggleSelect(e.id)} /></td>
                <td className="text-muted">{i + 1}</td>
                <td>{e.fullName}</td>
                <td>{e.department}</td>
                <td>{e.sede || <span className="text-muted">—</span>}</td>
                <td>{e.position}</td>
                <td>{e.assignedEquipmentCount ?? 0}</td>
                <td className="actions">
                  <Link to={`/empleados/${e.id}/editar`} className="btn btn-sm">Editar</Link>
                  <button onClick={() => handleDelete(e.id)} className="btn btn-sm btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="8" className="text-center">No se encontraron empleados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
