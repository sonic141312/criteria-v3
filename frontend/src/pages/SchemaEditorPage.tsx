import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schemasApi } from '@/api/client';

export function SchemaEditorPage() {
  const qc = useQueryClient();
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);

  const schemasQuery = useQuery({ queryKey: ['schemas'], queryFn: schemasApi.list });

  const selectedSchema = schemasQuery.data?.find((s: any) => s.id === selectedSchemaId);

  return (
    <div className="flex h-full">
      {/* Schema list */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Schemas</h2>
          <CreateSchemaButton onCreated={(id) => setSelectedSchemaId(id)} />
        </div>
        <div className="flex-1 overflow-auto">
          {schemasQuery.isLoading && <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>}
          {schemasQuery.data?.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelectedSchemaId(s.id)}
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
        onChange={e => setName(e.target.value)}
        placeholder="Schema name"
        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        autoFocus
      />
      <input
        value={desc}
        onChange={e => setDesc(e.target.value)}
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
  const schemaQuery = useQuery({ queryKey: ['schemas', schemaId], queryFn: () => schemasApi.get(schemaId) });
  const fieldsQuery = useQuery({ queryKey: ['schemas', schemaId, 'fields'], queryFn: () => schemasApi.listFields(schemaId) });

  const deleteMutation = useMutation({
    mutationFn: () => schemasApi.delete(schemaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schemas'] }),
  });

  const [showAddField, setShowAddField] = useState(false);
  const [fieldKey, setFieldKey] = useState('');
  const [fieldDisplayName, setFieldDisplayName] = useState('');
  const [fieldDataType, setFieldDataType] = useState('number');

  const addFieldMutation = useMutation({
    mutationFn: () => schemasApi.createField(schemaId, {
      key: fieldKey, displayName: fieldDisplayName, dataType: fieldDataType,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
      setShowAddField(false);
      setFieldKey('');
      setFieldDisplayName('');
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) => schemasApi.deleteField(schemaId, fieldId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] }),
  });

  // Edit field state
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const updateFieldMutation = useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: { displayName?: string; description?: string } }) =>
      schemasApi.updateField(schemaId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schemas', schemaId, 'fields'] });
      setEditingFieldId(null);
    },
  });

  const handleStartEdit = (field: any) => {
    setEditingFieldId(field.id);
    setEditDisplayName(field.displayName || '');
    setEditDescription(field.description || '');
  };

  const handleSaveEdit = () => {
    if (!editingFieldId) return;
    updateFieldMutation.mutate({
      fieldId: editingFieldId,
      data: { displayName: editDisplayName, description: editDescription || undefined },
    });
  };

  const handleCancelEdit = () => {
    setEditingFieldId(null);
    setEditDisplayName('');
    setEditDescription('');
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
          onClick={() => { if (confirm('Delete this schema?')) deleteMutation.mutate(); }}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-200 dark:border-red-800 rounded px-3 py-1"
        >
          Delete Schema
        </button>
      </div>

      {/* Fields */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fields</h2>
          <button
            onClick={() => setShowAddField(true)}
            className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-2 py-1 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            + Add Field
          </button>
        </div>

        {showAddField && (
          <form
            onSubmit={(e) => { e.preventDefault(); addFieldMutation.mutate(); }}
            className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 space-y-2"
          >
            <div className="grid grid-cols-3 gap-2">
              <input
                value={fieldKey}
                onChange={e => setFieldKey(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                placeholder="key (e.g. followers)"
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
              <input
                value={fieldDisplayName}
                onChange={e => setFieldDisplayName(e.target.value)}
                placeholder="Display name"
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                required
              />
              <select
                value={fieldDataType}
                onChange={e => setFieldDataType(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                {['number', 'string', 'boolean', 'percentage', 'datetime', 'array', 'object'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-1">
              <button type="submit" disabled={addFieldMutation.isPending}
                className="text-xs bg-blue-600 dark:bg-blue-700 text-white px-3 py-1 rounded">
                {addFieldMutation.isPending ? '...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowAddField(false)}
                className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">Cancel</button>
            </div>
          </form>
        )}

        {fieldsQuery.isLoading && <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading fields...</div>}

        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Display Name</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {(fieldsQuery.data as any[])?.map((f: any) => (
              <tr key={f.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                {editingFieldId === f.id ? (
                  // Edit mode
                  <>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700 dark:text-gray-300">{f.key}</td>
                    <td className="px-4 py-2">
                      <div className="space-y-1">
                        <input
                          value={editDisplayName}
                          onChange={e => setEditDisplayName(e.target.value)}
                          placeholder="Display name"
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full"
                        />
                        <input
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          placeholder="Description (optional)"
                          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 w-full"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {f.dataType}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={handleSaveEdit}
                          disabled={updateFieldMutation.isPending}
                          className="text-xs bg-green-600 dark:bg-green-700 text-white px-2 py-1 rounded hover:bg-green-700 dark:hover:bg-green-600"
                        >
                          {updateFieldMutation.isPending ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // View mode
                  <>
                    <td className="px-4 py-2 text-sm font-mono text-gray-700 dark:text-gray-300">{f.key}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-200">{f.displayName}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {f.dataType}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStartEdit(f)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete field?')) deleteFieldMutation.mutate(f.id); }}
                          className="text-xs text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {!fieldsQuery.data?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                  No fields yet. Add some to define the input data structure.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
