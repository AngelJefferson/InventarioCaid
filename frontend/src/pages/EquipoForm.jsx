import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, createProduct, updateProduct } from '../api/productService';
import { getCategories } from '../api/categoryService';
import { getEmployees } from '../api/employeeService';

async function runOcr(imageSrc, setOcrText) {
  try {
    const Tesseract = await import('tesseract.js');
    const { data } = await Tesseract.recognize(imageSrc, 'spa');
    setOcrText(data.text);
  } catch (err) {
    alert('Error al procesar la imagen: ' + err.message);
  }
}

function applyOcrText(ocrText, form, setForm) {
  const lines = ocrText.split('\n').filter((l) => l.trim());
  const updates = {};
  if (lines.length >= 2) {
    updates.model = lines[0].trim();
    updates.sku = lines[1].trim();
  } else if (lines.length === 1) {
    updates.sku = lines[0].trim();
  }
  if (Object.keys(updates).length) setForm({ ...form, ...updates });
}

const CONSULTORIOS = ['Consultorio 1', 'Consultorio 2', 'Consultorio 3', 'Consultorio 4'];

export default function EquipoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [categories, setCategories] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    name: '', sku: '', model: '', description: '', categoryId: '', employeeId: '',
    assetNumber: '', department: '', physicalLocation: '', operatingSystem: '',
    hardwareConfiguration: '', status: '', acquisitionDate: '', observations: '', maintenanceDate: '',
  });
  const [error, setError] = useState('');
  const fcls = (v) => v ? 'input-filled' : '';
  const [showScanner, setShowScanner] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [empOpen, setEmpOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const empRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    getCategories().then((r) => setCategories(r.data));
    getEmployees().then((r) => setEmployees(r.data));
    if (isEdit) getProduct(id).then((r) => {
      const p = r.data;
      setForm({
        name: p.name, sku: p.sku, model: p.model || '', description: p.description || '',
        categoryId: p.categoryId, employeeId: p.employeeId || '',
        assetNumber: p.assetNumber || '', department: p.department || '',
        physicalLocation: p.physicalLocation || '', operatingSystem: p.operatingSystem || '',
        hardwareConfiguration: p.hardwareConfiguration || '', status: p.status || '',
        acquisitionDate: p.acquisitionDate ? p.acquisitionDate.slice(0, 10) : '',
        observations: p.observations || '', maintenanceDate: p.maintenanceDate ? p.maintenanceDate.slice(0, 10) : '',
      });
      if (p.employeeName) setEmpSearch(p.employeeName);
    });
    document.addEventListener('mousedown', (e) => { if (empRef.current && !empRef.current.contains(e.target)) setEmpOpen(false); });
    return () => stopCamera();
  }, [id]);

  const filteredEmps = employees.filter((e) =>
    e.fullName.toLowerCase().includes(empSearch.toLowerCase())
  );

  const selectEmployee = (emp) => {
    setForm({ ...form, employeeId: emp.id, department: emp.department || '', physicalLocation: emp.sede || '' });
    setEmpSearch(emp.fullName);
    setEmpOpen(false);
  };

  const selectConsultorio = (name) => {
    const emp = employees.find((e) => e.fullName === name);
    if (emp) {
      selectEmployee(emp);
    } else {
      setForm({ ...form, employeeId: '' });
      setEmpSearch(name);
      setEmpOpen(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setShowScanner(true);
    } catch (err) {
      alert('No se pudo acceder a la cámara: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    stopCamera();
    setOcrLoading(true);
    await runOcr(imageData, setOcrText);
    setOcrLoading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      await runOcr(ev.target.result, setOcrText);
      setOcrLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyOcr = () => {
    applyOcrText(ocrText, form, setForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id, name: form.name, sku: form.sku, model: form.model, description: form.description,
        categoryId: form.categoryId,
        employeeId: form.employeeId || null,
        assetNumber: form.assetNumber || null,
        department: form.department, physicalLocation: form.physicalLocation,
        operatingSystem: form.operatingSystem, hardwareConfiguration: form.hardwareConfiguration,
        status: form.status,
        acquisitionDate: form.acquisitionDate || null,
        observations: form.observations,
        maintenanceDate: form.maintenanceDate || null,
      };
      if (isEdit) await updateProduct(id, payload);
      else await createProduct(payload);
      navigate('/equipos');
    } catch (err) {
      const data = err.response?.data;
      setError(data?.title || data?.error || data?.detail || 'Error al guardar el equipo');
    }
  };

  return (
    <div className="form-page">
      <h1>{isEdit ? 'Editar Equipo' : 'Nuevo Equipo'}</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-row">
          <div className="form-group">
            <label>Tipo de Equipo <span className="required">*</span></label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Ej: Laptop, Monitor, Impresora" className={fcls(form.name)} />
          </div>
          <div className="form-group">
            <label>Marca <span className="required">*</span></label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required className={fcls(form.categoryId)}>
              <option value="">Seleccionar marca</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Modelo <span className="required">*</span></label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required placeholder="Se llena con OCR" className={fcls(form.model)} />
          </div>
          <div className="form-group">
            <label>Nº de Serie <span className="required">*</span></label>
            <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="Se llena con OCR" className={fcls(form.sku)} />
          </div>
        </div>

        <div className="form-group">
          <label>Número de Activo</label>
          <input value={form.assetNumber} onChange={(e) => setForm({ ...form, assetNumber: e.target.value })} placeholder="Opcional" className={fcls(form.assetNumber)} />
        </div>

        <div className="form-group" ref={empRef} style={{ position: 'relative' }}>
          <label>Usuario Asignado <span className="required">*</span></label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {CONSULTORIOS.map((c) => (
              <button key={c} type="button" className={`btn btn-sm ${empSearch === c && !form.employeeId ? 'btn-primary' : ''}`}
                onClick={() => selectConsultorio(c)}>
                {c}
              </button>
            ))}
          </div>
          <input
            value={empSearch}
            onChange={(e) => { setEmpSearch(e.target.value); setEmpOpen(true); setForm({ ...form, employeeId: '' }); }}
            onFocus={() => setEmpOpen(true)}
            placeholder="Escribe para buscar empleado..." className={fcls(empSearch)}
          />
          {empOpen && (
            <div style={{
              position: 'absolute', zIndex: 100, background: '#fff', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', maxHeight: 200, overflowY: 'auto', width: '100%', marginTop: 2,
              boxShadow: 'var(--shadow)',
            }}>
              {filteredEmps.length === 0 ? (
                <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin resultados</div>
              ) : filteredEmps.map((e) => (
                <div key={e.id} onClick={() => selectEmployee(e)}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem', borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={(e) => e.target.style.background = 'var(--bg)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                  {e.fullName} {e.sede ? `[${e.sede}]` : ''} {e.department ? `(${e.department})` : ''}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Departamento <span className="required">*</span></label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required placeholder="Ej: TI, Contabilidad" className={fcls(form.department)} />
          </div>
          <div className="form-group">
            <label>Ubicación Física <span className="required">*</span></label>
            <input value={form.physicalLocation} onChange={(e) => setForm({ ...form, physicalLocation: e.target.value })} required placeholder="Ej: Edificio A, Piso 2" className={fcls(form.physicalLocation)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Sistema Operativo</label>
            <input value={form.operatingSystem} onChange={(e) => setForm({ ...form, operatingSystem: e.target.value })} placeholder="N/A si no aplica" className={fcls(form.operatingSystem)} />
          </div>
          <div className="form-group">
            <label>Configuración Hardware</label>
            <input value={form.hardwareConfiguration} onChange={(e) => setForm({ ...form, hardwareConfiguration: e.target.value })} placeholder="Ej: 8GB RAM, 256GB SSD" className={fcls(form.hardwareConfiguration)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Estado</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={fcls(form.status)}>
              <option value="">Seleccionar</option>
              <option value="Operativo">Operativo</option>
              <option value="Dañado">Dañado</option>
              <option value="Reparación">Reparación</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha de Adquisición</label>
            <input type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} />
          </div>
        </div>

        <div className="form-group">
          <label>Observaciones</label>
            <textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} placeholder="Opcional" className={fcls(form.observations)} />
        </div>

        <div className="form-group">
          <label>Fecha de Mantenimiento</label>
          <input type="date" value={form.maintenanceDate} onChange={(e) => setForm({ ...form, maintenanceDate: e.target.value })} />
        </div>

        <div className="form-group">
          <label>Escanear etiqueta (OCR)</label>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 8 }}>
            Sube una foto de la etiqueta o usa la cámara para capturar modelo y Nº de Serie automáticamente.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <button type="button" className="btn btn-accent" onClick={startCamera}>
              📷 Abrir cámara
            </button>
            <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()}>
              📁 Subir foto
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
          {ocrLoading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Procesando imagen...</p>}
          {showScanner && (
            <div className="scanner-section">
              <h3>Escáner de etiquetas</h3>
              <video ref={videoRef} autoPlay playsInline className="video-preview" />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-primary" onClick={capturePhoto}>Capturar</button>
                <button type="button" className="btn" onClick={stopCamera}>Cancelar</button>
              </div>
            </div>
          )}
          {ocrText && !showScanner && (
            <div style={{ marginTop: 8 }} className="scanner-section">
              <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Texto detectado (puedes editarlo):</label>
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontFamily: 'monospace' }}
              />
              <button type="button" className="btn btn-primary" style={{ marginTop: 8 }} onClick={applyOcr}>
                Aplicar a Modelo y Nº de Serie
              </button>
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">{isEdit ? 'Actualizar' : 'Crear'}</button>
          <button type="button" onClick={() => navigate('/equipos')} className="btn">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
