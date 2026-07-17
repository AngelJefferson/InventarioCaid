import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct, bulkCreateProducts, bulkDeleteProducts } from '../api/productService';
import { getCategories } from '../api/categoryService';
import { getEmployees } from '../api/employeeService';
import * as XLSX from 'xlsx';

const NA = (v) => (v == null || String(v).trim().toUpperCase() === 'N/A' || String(v).trim() === '') ? null : String(v).trim();
const NA_EMPTY = (v) => NA(v) ?? '';

const COL_MAP = {
  'Nº': null,
  'Tipo de Equipo': 'name',
  'Marca': 'categoryName',
  'Modelo': 'model',
  'Nº de Serie': 'sku',
  'Numero de Activo': 'assetNumber',
  'Número de Activo': 'assetNumber',
  'Usuario Asignado': 'employeeName',
  'Departamento': 'department',
  'Ubicación Física': 'physicalLocation',
  'Sistema Operativo': 'operatingSystem',
  'Configuracion Hardware': 'hardwareConfiguration',
  'Configuracion Hardware (DD, RAM, Procesador)': 'hardwareConfiguration',
  'Configuración Hardware': 'hardwareConfiguration',
  'Estado': 'status',
  'Fecha de Adquisición': 'acquisitionDate',
  'Observaciones': 'observations',
  'Fecha Mantenimiento': 'maintenanceDate',
};

export default function Equipos() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [selected, setSelected] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([
      getProducts().then((r) => setProducts(r.data)),
      getCategories().then((r) => setCategories(r.data)),
      getEmployees().then((r) => setEmployees(r.data)),
    ]).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    await deleteProduct(id);
    load();
  };

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((p) => p.id));
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(`¿Eliminar ${selected.length} equipo(s)?`)) return;
    await bulkDeleteProducts(selected);
    setSelected([]);
    load();
  };

  const exportExcel = () => {
    const data = products.map((p) => ({
      'Tipo de Equipo': p.name,
      'Marca': p.categoryName,
      'Modelo': p.model || '—',
      'Nº de Serie': p.sku,
      'Numero de Activo': p.assetNumber || '',
      'Usuario Asignado': p.employeeName || '—',
      'Departamento': p.department || '',
      'Ubicación Física': p.physicalLocation || '',
      'Sistema Operativo': p.operatingSystem || '',
      'Configuracion Hardware': p.hardwareConfiguration || '',
      'Estado': p.status || '',
      'Fecha de Adquisición': p.acquisitionDate ? new Date(p.acquisitionDate).toLocaleDateString() : '',
      'Observaciones': p.observations || '',
      'Fecha de Mantenimiento': p.maintenanceDate ? new Date(p.maintenanceDate).toLocaleDateString() : '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');
    XLSX.writeFile(wb, 'InventarioCAID_Equipos.xlsx');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      setImportData(rows);
      setImportMsg(`Se encontraron ${rows.length} registros.`);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const parseDate = (v) => {
    const s = NA(v);
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const doImport = async () => {
    if (!importData || importData.length === 0) return;
    setImporting(true);
    setImportMsg('');
    try {
      const items = importData.map((row) => {
        const mapped = {};
        for (const [col, field] of Object.entries(COL_MAP)) {
          if (!field) continue;
          mapped[field] = row[col] !== undefined ? String(row[col]).trim() : '';
        }
        return {
          name: NA_EMPTY(mapped.name),
          categoryName: NA_EMPTY(mapped.categoryName),
          model: NA_EMPTY(mapped.model),
          sku: NA_EMPTY(mapped.sku),
          assetNumber: NA(mapped.assetNumber),
          employeeName: NA(mapped.employeeName),
          department: NA_EMPTY(mapped.department),
          physicalLocation: NA_EMPTY(mapped.physicalLocation),
          operatingSystem: NA_EMPTY(mapped.operatingSystem),
          hardwareConfiguration: NA_EMPTY(mapped.hardwareConfiguration),
          status: NA_EMPTY(mapped.status),
          acquisitionDate: parseDate(mapped.acquisitionDate),
          observations: NA_EMPTY(mapped.observations),
          maintenanceDate: parseDate(mapped.maintenanceDate),
        };
      });
      const res = await bulkCreateProducts({ products: items });
      setImportMsg(`¡${res.data.created} equipos importados correctamente!`);
      setImportData(null);
      load();
    } catch (err) {
      const data = err.response?.data;
      setImportMsg(data?.error || data?.title || 'Error al importar');
    } finally {
      setImporting(false);
    }
  };

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) ||
      (p.model || '').toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.assetNumber || '').toLowerCase().includes(q) ||
      (p.categoryName || '').toLowerCase().includes(q) ||
      (p.department || '').toLowerCase().includes(q);
  });

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Equipos</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-accent" onClick={exportExcel}>📥 Exportar</button>
          <button className="btn btn-primary" onClick={() => { setShowImport(true); setImportMsg(''); setImportData(null); }}><svg width="16" height="16" viewBox="0 0 16 16" style={{verticalAlign:'middle',marginRight:4}}><rect x="1" y="1" width="14" height="14" rx="2" fill="#217346"/><text x="8" y="12" text-anchor="middle" fill="white" font-size="9" font-weight="bold" font-family="Arial">X</text></svg> Cargar Excel</button>
          <Link to="/equipos/nuevo" className="btn btn-success">+ Nuevo Equipo</Link>
          {selected.length > 0 && <button className="btn btn-danger" onClick={handleBulkDelete}>🗑 Eliminar {selected.length}</button>}
        </div>
      </div>
      <div className="search-bar">
        <input placeholder="Buscar por equipo, modelo, serie, marca o departamento..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleSelectAll} /></th>
              <th>N°</th>
              <th>Tipo de Equipo</th>
              <th>Marca</th>
              <th>Modelo</th>
              <th>Nº de Serie</th>
              <th>N° Activo</th>
              <th>Asignado a</th>
              <th>Departamento</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id}>
                <td><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} /></td>
                <td className="text-muted">{i + 1}</td>
                <td>{p.name}</td>
                <td>{p.categoryName}</td>
                <td>{p.model || <span className="text-muted">—</span>}</td>
                <td><code>{p.sku}</code></td>
                <td>{p.assetNumber || <span className="text-muted">—</span>}</td>
                <td>{p.employeeName || <span className="text-muted">—</span>}</td>
                <td>{p.department || <span className="text-muted">—</span>}</td>
                <td>{p.physicalLocation || <span className="text-muted">—</span>}</td>
                <td>{p.status || <span className="text-muted">—</span>}</td>
                <td className="actions">
                  <Link to={`/equipos/${p.id}/editar`} className="btn btn-sm">Editar</Link>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-sm btn-danger">Eliminar</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan="12" className="text-center">No se encontraron equipos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Importar Equipos</h2>
            <p className="text-muted" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
              Selecciona un archivo Excel (.xlsx) con los datos de los equipos.
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={handleImportFile} style={{ marginBottom: 12 }} />
            {importMsg && <div className={`alert ${importMsg.includes('Error') ? 'alert-error' : 'alert-success'}`}>{importMsg}</div>}
            {importData && importData.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginBottom: 12, fontSize: '0.85rem' }}>
                <strong>Vista previa ({importData.length} registros):</strong>
                <table className="table" style={{ fontSize: '0.78rem' }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Equipo</th>
                      <th>Marca</th>
                      <th>Modelo</th>
                      <th>Serie</th>
                      <th>Asignado</th>
                      <th>Depto</th>
                      <th>Ubicación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{row['Tipo de Equipo']}</td>
                        <td>{row['Marca']}</td>
                        <td>{row['Modelo']}</td>
                        <td>{row['Nº de Serie']}</td>
                        <td>{row['Usuario Asignado']}</td>
                        <td>{row['Departamento']}</td>
                        <td>{row['Ubicación Física']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {importData.length > 10 && <p className="text-muted">... y {importData.length - 10} más</p>}
              </div>
            )}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={doImport} disabled={!importData || importing}>
                {importing ? 'Importando...' : 'Importar'}
              </button>
              <button className="btn" onClick={() => setShowImport(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
