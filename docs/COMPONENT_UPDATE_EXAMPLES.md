# Component Update Examples

This document shows how to update existing components to use the new API service.

---

## Example 1: Program List Component

### Before (Using localStorage)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { storage, Program } from '@/lib/storage';

export default function ProgramsList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  
  useEffect(() => {
    // Synchronous call to localStorage
    const data = storage.getAllPrograms();
    setPrograms(data);
  }, []);
  
  const handleDelete = (id: string) => {
    storage.deleteProgram(id);
    setPrograms(programs.filter(p => p.id !== id));
  };
  
  return (
    <div>
      <h1>Programs</h1>
      {programs.map(program => (
        <div key={program.id}>
          <h3>{program.name}</h3>
          <button onClick={() => handleDelete(program.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
```

### After (Using API Service)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Program } from '@/lib/storage';
import { storageAdapter } from '@/lib/storage-adapter';
import { apiService } from '@/lib/api-service';

export default function ProgramsList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadPrograms();
  }, []);
  
  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      // Async call with automatic API/localStorage fallback
      const data = await storageAdapter.getAllPrograms();
      setPrograms(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load programs');
      console.error('Error loading programs:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this program?')) return;
    
    try {
      await storageAdapter.deleteProgram(id);
      // Refresh list
      await loadPrograms();
    } catch (err: any) {
      alert('Failed to delete program: ' + err.message);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600">Loading programs...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={loadPrograms}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Programs</h1>
        <button 
          onClick={loadPrograms}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Refresh
        </button>
      </div>
      
      {programs.length === 0 ? (
        <p className="text-gray-500">No programs found</p>
      ) : (
        <div className="space-y-4">
          {programs.map(program => (
            <div key={program.id} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold">{program.name}</h3>
              <p className="text-sm text-gray-600">
                Total: {program.totalInspections} | 
                OK: {program.okCount} | 
                NG: {program.ngCount}
              </p>
              <button 
                onClick={() => handleDelete(program.id)}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Key Changes:

1. ✅ Added async/await for all storage operations
2. ✅ Added loading state
3. ✅ Added error handling with user feedback
4. ✅ Added refresh capability
5. ✅ Improved UX with proper loading/error states

---

## Example 2: Program Editor Component

### Before

```typescript
'use client';

import { useState, useEffect } from 'react';
import { storage, Program } from '@/lib/storage';

export default function ProgramEditor({ programId }: { programId: string }) {
  const [program, setProgram] = useState<Program | null>(null);
  
  useEffect(() => {
    const data = storage.getProgram(programId);
    setProgram(data);
  }, [programId]);
  
  const handleSave = () => {
    if (program) {
      storage.saveProgram(program);
      alert('Saved!');
    }
  };
  
  if (!program) return <div>Loading...</div>;
  
  return (
    <div>
      <input
        value={program.name}
        onChange={(e) => setProgram({ ...program, name: e.target.value })}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### After

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Program } from '@/lib/storage';
import { storageAdapter } from '@/lib/storage-adapter';

export default function ProgramEditor({ programId }: { programId: string }) {
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadProgram();
  }, [programId]);
  
  const loadProgram = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storageAdapter.getProgram(programId);
      setProgram(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!program) return;
    
    try {
      setSaving(true);
      setError(null);
      await storageAdapter.saveProgram(program);
      alert('Program saved successfully!');
    } catch (err: any) {
      setError(err.message);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  
  if (error && !program) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button onClick={loadProgram} className="mt-2 btn-primary">
          Retry
        </button>
      </div>
    );
  }
  
  if (!program) {
    return <div className="text-gray-600">Program not found</div>;
  }
  
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium mb-1">
          Program Name
        </label>
        <input
          value={program.name}
          onChange={(e) => setProgram({ ...program, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
          disabled={saving}
        />
      </div>
      
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Program'}
      </button>
    </div>
  );
}
```

---

## Example 3: Master Image Upload

### Before

```typescript
const handleImageUpload = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    const updatedProgram = {
      ...program,
      config: {
        ...program.config,
        masterImage: base64
      }
    };
    storage.saveProgram(updatedProgram);
  };
  reader.readAsDataURL(file);
};
```

### After

```typescript
const handleImageUpload = async (file: File) => {
  try {
    setUploading(true);
    setError(null);
    
    // Upload image via API
    const result = await apiService.uploadMasterImage(
      parseInt(program.id), 
      file
    );
    
    console.log('Image uploaded:', result.path);
    console.log('Quality score:', result.quality);
    
    // Update program config (image path is stored automatically)
    await loadProgram(); // Refresh program data
    
    alert('Master image uploaded successfully!');
  } catch (err: any) {
    setError(err.message);
    alert('Failed to upload image: ' + err.message);
  } finally {
    setUploading(false);
  }
};
```

---

## Example 4: Statistics Update (Run Page)

### Before

```typescript
// After inspection completes
storage.updateStats(currentProgram.id, {
  totalInspections: newTotal,
  okCount: newOk,
  ngCount: newNg,
  lastRun: new Date().toLocaleString()
});
```

### After

```typescript
// After inspection completes
try {
  await storageAdapter.updateStats(currentProgram.id, {
    totalInspections: newTotal,
    okCount: newOk,
    ngCount: newNg,
    lastRun: new Date().toISOString()
  });
} catch (error) {
  // Non-critical error, log but don't interrupt
  console.error('Failed to update stats:', error);
}
```

---

## Example 5: Creating New Program

### Before

```typescript
const createProgram = () => {
  const newProgram: Program = {
    id: Date.now().toString(),
    name: programName,
    created: new Date().toISOString(),
    lastRun: null,
    totalInspections: 0,
    okCount: 0,
    ngCount: 0,
    config: defaultConfig
  };
  
  storage.saveProgram(newProgram);
  router.push(`/setup/${newProgram.id}`);
};
```

### After

```typescript
const createProgram = async () => {
  try {
    setCreating(true);
    setError(null);
    
    const newProgram = await apiService.createProgram({
      name: programName,
      config: defaultConfig
    });
    
    // Navigate to setup page
    router.push(`/setup/${newProgram.id}`);
  } catch (err: any) {
    setError(err.message);
    
    if (err.message.includes('already exists')) {
      alert('A program with this name already exists. Please choose a different name.');
    } else {
      alert('Failed to create program: ' + err.message);
    }
  } finally {
    setCreating(false);
  }
};
```

---

## Update Checklist

For each component that uses storage:

### 1. Update Imports
```typescript
// Old
import { storage } from '@/lib/storage';

// New
import { storageAdapter } from '@/lib/storage-adapter';
import { apiService } from '@/lib/api-service';
```

### 2. Add State Management
```typescript
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [saving, setSaving] = useState(false);
```

### 3. Convert to Async
```typescript
// Old
const data = storage.getAllPrograms();

// New
const data = await storageAdapter.getAllPrograms();
```

### 4. Add Error Handling
```typescript
try {
  await storageAdapter.saveProgram(program);
} catch (err: any) {
  setError(err.message);
  console.error('Save failed:', err);
}
```

### 5. Add Loading States
```typescript
if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
```

### 6. Update Image Handling
```typescript
// Old: Store base64 in config
config.masterImage = base64String;

// New: Upload via API
await apiService.uploadMasterImage(programId, blob);
```

---

## Components That Need Updates

Based on grep results, these components likely use storage:

1. ✅ `app/programs/page.tsx` - Program list
2. ✅ `app/run/page.tsx` - Stats updates
3. ✅ `app/setup/page.tsx` - Program editor
4. ⏳ Any other components using `storage` from `@/lib/storage`

Use find command to locate:
```bash
grep -r "from '@/lib/storage'" --include="*.tsx" --include="*.ts"
```

---

## Testing Updated Components

### Manual Test Checklist

For each updated component:

- [ ] Loads data correctly
- [ ] Shows loading state
- [ ] Handles errors gracefully
- [ ] Save operations work
- [ ] Delete operations work
- [ ] Falls back to localStorage if API unavailable
- [ ] Loading indicators appear
- [ ] Error messages are user-friendly

### Test Offline Mode

```typescript
// In browser console
// Simulate offline mode
window.fetch = () => Promise.reject(new Error('NetworkError'));

// Component should:
// 1. Show error or loading state
// 2. Fall back to localStorage
// 3. Display warning about offline mode
```

---

## Common Patterns

### Pattern 1: Load Data on Mount

```typescript
useEffect(() => {
  loadData();
}, []);

async function loadData() {
  try {
    setLoading(true);
    const data = await storageAdapter.getAllPrograms();
    setPrograms(data);
  } catch (error: any) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
}
```

### Pattern 2: Save with Feedback

```typescript
async function handleSave() {
  try {
    setSaving(true);
    await storageAdapter.saveProgram(program);
    toast.success('Saved successfully!');
  } catch (error: any) {
    toast.error('Save failed: ' + error.message);
  } finally {
    setSaving(false);
  }
}
```

### Pattern 3: Delete with Confirmation

```typescript
async function handleDelete(id: string) {
  if (!confirm('Are you sure?')) return;
  
  try {
    await storageAdapter.deleteProgram(id);
    await loadPrograms(); // Refresh
  } catch (error: any) {
    alert('Delete failed: ' + error.message);
  }
}
```

---

## Migration to storageAdapter vs Direct API

### Use `storageAdapter` for:
- ✅ General CRUD operations
- ✅ Backward compatibility
- ✅ Automatic fallback needed
- ✅ Simple operations

### Use `apiService` directly for:
- ✅ Backup/restore operations
- ✅ Master image upload/download
- ✅ Camera operations
- ✅ When you want explicit control
- ✅ New features that don't need fallback

---

## Next Steps

1. Update components one by one
2. Test each component thoroughly
3. Check linting errors
4. Verify offline fallback works
5. Add to app layout: `<MigrationDialog />`

---

## Support

If you encounter issues:
1. Check the console for errors
2. Verify backend is running
3. Check API health: `await apiService.checkHealth()`
4. Review this guide
5. Check the main documentation files
