import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { schemasApi } from '@/api/client';
import { useToast } from '@/context/ToastContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { EmptyState } from '@/components/EmptyState';

const DATA_TYPES = ['number', 'string', 'boolean', 'percentage', 'datetime', 'array', 'object'];

interface ParsedField {
  key: string;
  displayName: string;
  dataType: string;
  description?: string;
}

interface BulkFormRow {
  key: string;
  displayName: string;
  dataType: string;
}

export function SchemaEditorPage() {
  const params = useParams();
  const urlSchemaId = params.schemaId;
  const navigate = useNavigate();
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(urlSchemaId ?? null);

  const schemasQuery = useQuery({ queryKey: ['schemas'], queryFn: schemasApi.list });

  const handleSelect = (id: string) => {
    setSelectedSchemaId(id);
    navigate(`/schemas/${id}`);
  };

  const selectedSchema = schemasQuery.data?.find((s: any) => s.id === selectedSchemaId);

  return (
    <div className="flex h-full">
      {/* Schema list */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Schemas</h2>
          <CreateSchemaButton onCreated={(id) => handleSelect(id)} />
        </div>
        <div className="flex-1 overflow-auto">
          {schemasQuery.isLoading && <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
          {schemasQuery.data?.map((s: any) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                selectedSchemaId === s.id
                  ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="font-medium">{s.name}</div>
              {s.description && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{s.description}</div>}
            </button>
          ))}
          {schemasQuery.data?.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500">No schemas yet. Create one to get started.</p>
          )}
        </div>
      </div>

      {/* Schema detail */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {selectedSchema ? (
          <SchemaDetail schemaId={selectedSchemaId!} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 text-sm">
            Select a schema to view or edit
          </div>
        )}
      </div>
    </div>
  );
}

function CreateSchemaButton({ onCreated }: { onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const mutation = useMutation({
    mutationFn: () => schemasApi.create({ name, description: desc }),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['schemas'] });
      setOpen(false);
      setName('');
      setDesc('');
      onCreated(data.id);
    },
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600">
        + New
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
      className="space-y-1"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Schema name"
        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        autoFocus
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Description (optional)"
        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      />
      <div className="flex gap-1">
        <button type="submit" disabled={mutation.isPending} className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-2 py-1 rounded">
          {mutation.isPending ? '...' : 'Create'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Cancel</button>
      </div>
    </form>
  );
}

function SchemaDetail({ schemaId }: { schemaId: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const schemaQuery = useQuery({ queryKey: ['schemas', schemaId], queryFn: () => schemasApi.get(schemaId) });
  const fieldsQuery = useQuery({ queryKey: ['schemas', schemaId, 'fields'], queryFn: () => schemasApi.listFields(schemaId) });

  const schemasQuery = useQuery({ queryKey: ['schemas'], queryFn: schemasApi.list });

  const [confirmDeleteSchema, setConfirmDeleteSchema] = useState(false);
  const [confirmDeleteField, setConfirmDeleteField] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => schemasApi.delete(schemaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas'] });
      toast('Schema deleted', 'success');
    },
    onError: (err: any) => toast(`Failed to delete: ${err.message}`, 'error'),
  });

  const addFieldMutation = useMutation({
    mutationFn: (data: { key: string; displayName: string; dataType: string; description?: string }) =>
      schemasApi.createField(schemaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
      toast('Field added', 'success');
    },
    onError: (err: any) => toast(`Failed to add: ${err.message}`, 'error'),
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) => schemasApi.deleteField(schemaId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
      toast('Field deleted', 'success');
    },
    onError: (err: any) => toast(`Failed to delete: ${err.message}`, 'error'),
  });

  const [editingField, setEditingField] = useState<null | { id: string; displayName: string; description: string }>(null);

  const updateFieldMutation = useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: { displayName?: string; description?: string } }) =>
      schemasApi.updateField(schemaId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
      setEditingField(null);
      toast('Field updated', 'success');
    },
    onError: (err: any) => toast(`Failed to update: ${err.message}`, 'error'),
  });

  const handleDeleteField = () => {
    if (confirmDeleteField) {
      deleteFieldMutation.mutate(confirmDeleteField);
      setConfirmDeleteField(null);
    }
  };

  if (schemaQuery.isLoading) return <div className="p-4 text-gray-500 dark:text-gray-400">Loading...</div>;
  const schema: any = schemaQuery.data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{schema.name}</h1>
          {schema.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{schema.description}</p>}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">ID: {schema.id}</p>
        </div>
        <button
          onClick={() => setConfirmDeleteSchema(true)}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-3 py-1"
        >
          Delete Schema
        </button>
      </div>

      {/* Fields */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Fields ({fieldsQuery.data ? (fieldsQuery.data as any[]).length : 0})
          </h2>
          <div className="flex gap-2">
            <AddFieldButton onAdd={(data) => addFieldMutation.mutate(data)} pending={addFieldMutation.isPending} />
            <BulkImportButton
              schemaId={schemaId}
              onImport={(fields) => {
                let i = 0;
                const next = () => {
                  if (i >= fields.length) {
                    qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
                    toast(`Imported ${fields.length} fields`, 'success');
                    return;
                  }
                  addFieldMutation.mutate(fields[i], {
                    onSuccess: () => { i++; next(); },
                    onError: (e) => toast(`Failed at field ${i + 1}: ${e.message}`, 'error'),
                  });
                };
                next();
              }}
            />
            <DuplicateFromSchemaButton
              schemas={(schemasQuery.data as any[]) || []}
              currentSchemaId={schemaId}
              onImport={(fields) => {
                let i = 0;
                const next = () => {
                  if (i >= fields.length) {
                    qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
                    toast(`Imported ${fields.length} fields`, 'success');
                    return;
                  }
                  addFieldMutation.mutate(fields[i], {
                    onSuccess: () => { i++; next(); },
                    onError: (e) => toast(`Failed at field ${i + 1}: ${e.message}`, 'error'),
                  });
                };
                next();
              }}
            />
          </div>
        </div>

        {fieldsQuery.isLoading && <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading fields...</div>}

        {fieldsQuery.data && (fieldsQuery.data as any[]).length === 0 && (
          <EmptyState
            icon="📋"
            title="No fields yet"
            description="Add field-by-field, paste JSON for bulk import, or duplicate from another schema."
          />
        )}

        {fieldsQuery.data && (fieldsQuery.data as any[]).length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-2 font-medium">Key</th>
                <th className="px-4 py-2 font-medium">Display Name</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {(fieldsQuery.data as any[]).map((f: any) => (
                <tr key={f.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2 text-sm font-mono text-gray-700 dark:text-gray-300">{f.key}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">{f.displayName}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {f.dataType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                    {f.description || <span className="italic">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingField({ id: f.id, displayName: f.displayName || '', description: f.description || '' })}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmDeleteField(f.id)}
                        className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmDeleteSchema}
        title="Delete Schema"
        message="Delete this schema permanently? All fields and dependent evaluations may break."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => { setConfirmDeleteSchema(false); deleteMutation.mutate(); }}
        onCancel={() => setConfirmDeleteSchema(false)}
      />

      <ConfirmDialog
        open={!!confirmDeleteField}
        title="Delete Field"
        message="Delete this field? Any graph nodes referencing it will break."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteField}
        onCancel={() => setConfirmDeleteField(null)}
      />

      <EditFieldModal
        editing={editingField}
        onClose={() => setEditingField(null)}
        onSave={(displayName, description) => {
          if (editingField) {
            updateFieldMutation.mutate({ fieldId: editingField.id, data: { displayName, description } });
          }
        }}
        pending={updateFieldMutation.isPending}
      />
    </div>
  );
}

function AddFieldButton({ onAdd, pending }: { onAdd: (data: { key: string; displayName: string; dataType: string }) => void; pending: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkFormRow[]>([
    { key: '', displayName: '', dataType: 'number' },
  ]);

  const reset = () => {
    setRows([{ key: '', displayName: '', dataType: 'number' }]);
  };

  const handleAddRow = () => setRows((r) => [...r, { key: '', displayName: '', dataType: 'number' }]);
  const handleRemoveRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<BulkFormRow>) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  };

  const submit = () => {
    const valid = rows.filter((r) => r.key.trim() && r.displayName.trim());
    if (valid.length === 0) return;
    valid.forEach((r) =>
      onAdd({ key: r.key.trim().toLowerCase().replace(/\s+/g, '_'), displayName: r.displayName.trim(), dataType: r.dataType }),
    );
    setOpen(false);
    reset();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
      >
        + Add Field
      </button>
      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="Add Field(s)" size="lg">
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Add one or more fields at once. Empty rows are skipped on submit.</p>
          <div className="space-y-2 max-h-96 overflow-auto">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_2fr_1fr_auto] gap-2 items-center">
                <input
                  value={row.key}
                  onChange={(e) => updateRow(i, { key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  placeholder="key (snake_case)"
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  value={row.displayName}
                  onChange={(e) => updateRow(i, { displayName: e.target.value })}
                  placeholder="Display name"
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <select
                  value={row.dataType}
                  onChange={(e) => updateRow(i, { dataType: e.target.value })}
                  className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {DATA_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
                <button
                  onClick={() => handleRemoveRow(i)}
                  disabled={rows.length === 1}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-30"
                  aria-label="Remove row"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2">
            <button onClick={handleAddRow} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              + Add row
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={pending}
                className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                {pending ? 'Adding...' : `Add ${rows.filter((r) => r.key && r.displayName).length} field(s)`}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

function BulkImportButton({ onImport }: { schemaId: string; onImport: (fields: ParsedField[]) => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedField[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (raw: string) => {
    setError(null);
    if (!raw.trim()) {
      setParsed(null);
      return;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      setError('Invalid JSON syntax');
      setParsed(null);
      return;
    }
    if (!Array.isArray(data)) {
      setError('JSON must be an array of field objects');
      setParsed(null);
      return;
    }
    const result: ParsedField[] = [];
    for (let i = 0; i < data.length; i++) {
      const item: any = data[i];
      if (!item || typeof item !== 'object') {
        setError(`Item #${i + 1} is not an object`);
        setParsed(null);
        return;
      }
      if (!item.key || typeof item.key !== 'string') {
        setError(`Item #${i + 1}: missing 'key'`);
        setParsed(null);
        return;
      }
      if (!item.displayName || typeof item.displayName !== 'string') {
        setError(`Item #${i + 1}: missing 'displayName'`);
        setParsed(null);
        return;
      }
      if (!item.dataType || !DATA_TYPES.includes(item.dataType)) {
        setError(`Item #${i + 1}: invalid or missing 'dataType' (one of ${DATA_TYPES.join(', ')})`);
        setParsed(null);
        return;
      }
      result.push({
        key: String(item.key).trim().toLowerCase().replace(/\s+/g, '_'),
        displayName: String(item.displayName).trim(),
        dataType: item.dataType,
        description: item.description ? String(item.description) : undefined,
      });
    }
    if (result.length === 0) {
      setError('Array is empty');
    }
    setParsed(result);
  };

  const handleImport = () => {
    if (!parsed || parsed.length === 0) return;
    onImport(parsed);
    setOpen(false);
    setText('');
    setParsed(null);
    toast(`Importing ${parsed.length} fields...`, 'info');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs border border-gray-300 dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      >
        Bulk Import (JSON)
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setText(''); setParsed(null); setError(null); }} title="Bulk Import Fields" size="xl">
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paste a JSON array. Example:
          </p>
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 overflow-auto">
{`[
  { "key": "followers", "displayName": "Followers", "dataType": "number" },
  { "key": "likes", "displayName": "Likes", "dataType": "number", "description": "Total likes" }
]`}
          </pre>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); validate(e.target.value); }}
            placeholder='[{"key":"followers","displayName":"Followers","dataType":"number"}]'
            rows={8}
            className="w-full font-mono text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}
          {parsed && parsed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Preview ({parsed.length} fields)</p>
              <div className="max-h-32 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-2 py-1 text-left">Key</th>
                      <th className="px-2 py-1 text-left">Display Name</th>
                      <th className="px-2 py-1 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((p, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="px-2 py-1 font-mono">{p.key}</td>
                        <td className="px-2 py-1">{p.displayName}</td>
                        <td className="px-2 py-1">{p.dataType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setOpen(false); setText(''); setParsed(null); setError(null); }}
              className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parsed || parsed.length === 0}
              className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              Import {parsed?.length || 0} field(s)
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function DuplicateFromSchemaButton({
  schemas,
  currentSchemaId,
  onImport,
}: {
  schemas: any[];
  currentSchemaId: string;
  onImport: (fields: ParsedField[]) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sourceSchemaId, setSourceSchemaId] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [fields, setFields] = useState<ParsedField[]>([]);

  const sourceFieldsQuery = useQuery({
    queryKey: ['schemas', sourceSchemaId, 'fields'],
    queryFn: () => schemasApi.listFields(sourceSchemaId),
    enabled: !!sourceSchemaId,
  });

  const handleSourceChange = (id: string) => {
    setSourceSchemaId(id);
    setLoaded(false);
    setSelected(new Set());
    setFields([]);
  };

  const handleLoadFields = () => {
    if (!sourceFieldsQuery.data) return;
    const list = (sourceFieldsQuery.data as any[]).map((f) => ({
      key: `${f.key}_copy`,
      displayName: `${f.displayName} (copy)`,
      dataType: f.dataType,
      description: f.description,
    }));
    setFields(list);
    setSelected(new Set(list.map((f) => f.key)));
    setLoaded(true);
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleImport = () => {
    const chosen = fields.filter((f) => selected.has(f.key));
    if (chosen.length === 0) return;
    onImport(chosen);
    setOpen(false);
    setSourceSchemaId('');
    setLoaded(false);
    setFields([]);
    setSelected(new Set());
    toast(`Importing ${chosen.length} fields...`, 'info');
  };

  const otherSchemas = schemas.filter((s) => s.id !== currentSchemaId);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs border border-gray-300 dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      >
        Duplicate from Schema
      </button>
      <Modal open={open} onClose={() => { setOpen(false); setSourceSchemaId(''); setLoaded(false); setFields([]); setSelected(new Set()); }} title="Duplicate Fields from Schema" size="lg">
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Source Schema</label>
            <select
              value={sourceSchemaId}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select a schema...</option>
              {otherSchemas.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {sourceSchemaId && !loaded && (
            <button
              onClick={handleLoadFields}
              className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
            >
              Load Fields
            </button>
          )}
          {loaded && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Imported fields will have "_copy" suffix to avoid duplicates. Uncheck to skip.
              </p>
              <div className="max-h-48 overflow-auto border border-gray-200 dark:border-gray-700 rounded">
                {fields.map((f, i) => (
                  <label key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.has(f.key)}
                      onChange={() => toggle(f.key)}
                    />
                    <span className="font-mono">{f.key}</span>
                    <span className="text-gray-500 dark:text-gray-400">— {f.displayName} ({f.dataType})</span>
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => { setOpen(false); setSourceSchemaId(''); setLoaded(false); setFields([]); setSelected(new Set()); }}
              className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              Import {selected.size} field(s)
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function EditFieldModal({
  editing,
  onClose,
  onSave,
  pending,
}: {
  editing: { id: string; displayName: string; description: string } | null;
  onClose: () => void;
  onSave: (displayName: string, description: string) => void;
  pending: boolean;
}) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editing) {
      setDisplayName(editing.displayName);
      setDescription(editing.description);
    }
  }, [editing]);

  if (!editing) return null;

  const handleSave = () => {
    onSave(displayName, description);
  };

  return (
    <Modal open={!!editing} onClose={onClose} title="Edit Field" size="md">
      <div className="p-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="text-xs text-gray-500 dark:text-gray-400 px-3 py-1.5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={pending || !displayName.trim()}
            className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1.5 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
