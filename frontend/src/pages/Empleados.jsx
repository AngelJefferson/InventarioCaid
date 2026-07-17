import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getEmployees, deleteEmployee } from '../api/employeeService';

export default function Empleados() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getEmployees().then((r) => setEmployees(r.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
        <Link to="/empleados/nuevo" className="btn btn-primary">+ Nuevo Empleado</Link>
      </div>
      <div className="search-bar">
        <input placeholder="Buscar empleado por nombre o departamento..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
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
              <tr><td colSpan="7" className="text-center">No se encontraron empleados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
