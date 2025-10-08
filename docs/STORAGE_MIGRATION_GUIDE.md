# Storage System Migration Guide

## Overview

This guide explains how to migrate from the old localStorage-based storage to the new API-based storage system with database persistence.

---

## Quick Start

### For Users

1. **Automatic Migration**: The system will automatically detect existing localStorage data and prompt you to migrate
2. **One-Click Migration**: Click "Migrate Now" when prompted
3. **Verification**: The system will verify all data was migrated successfully
4. **Backup**: Your original data is backed up automatically

### For Developers

```typescript
import { apiService } from '@/lib/api-service';
import { MigrationManager } from '@/lib/migration-utility';
import { storageAdapter } from '@/lib/storage-adapter';

// Check if migration is needed
const status = MigrationManager.checkMigrationStatus();

if (status.needed) {
  // Perform migration
  const result = await MigrationManager.migrate();
  
  if (result.success) {
    console.log(`Migrated ${result.programsMigrated} programs`);
  }
}

// Use storage adapter (automatically uses API or localStorage)
const programs = await storageAdapter.getAllPrograms();
```

---

## Architecture Changes

### Before (localStorage only)

```
┌──────────────┐
│   Frontend   │
│  Components  │
└──────┬───────┘
       │
┌──────▼───────┐
│  localStorage│  ← 5-10MB limit, no backup
└──────────────┘
```

### After (API with fallback)

```
┌──────────────┐
│   Frontend   │
│  Components  │
└──────┬───────┘
       │
┌──────▼───────────┐
│ Storage Adapter  │
└──────┬───────────┘
       │
   ┌───┴────┐
   ▼        ▼
┌─────┐  ┌──────────┐
│Cache│  │   API    │  ← Primary
└─────┘  └─────┬────┘
              │
         ┌────▼─────┐
         │ Database │  ← SQLite
         └──────────┘
         
┌──────────────┐
│ localStorage │  ← Fallback only
└──────────────┘
```

---

## Migration Process

### Step 1: Check Migration Status

```typescript
import { MigrationManager } from '@/lib/migration-utility';

const report = MigrationManager.getMigrationReport();

console.log(`Migration needed: ${report.status.needed}`);
console.log(`Programs to migrate: ${report.status.programCount}`);
console.log(`Estimated size: ${report.status.estimatedSize} bytes`);
```

### Step 2: Run Migration (Dry Run)

```typescript
// Test migration without making changes
const dryRunResult = await MigrationManager.migrate({ 
  dryRun: true 
});

console.log('Dry run results:', dryRunResult);
```

### Step 3: Perform Migration

```typescript
// Actual migration
const result = await MigrationManager.migrate({
  dryRun: false,
  skipBackup: false,      // Create backup before migration
  continueOnError: true   // Continue if individual programs fail
});

if (result.success) {
  console.log('✓ Migration successful!');
  console.log(`  Programs: ${result.programsMigrated}`);
  console.log(`  Images: ${result.imagesMigrated}`);
} else {
  console.error('✗ Migration failed');
  console.error('Errors:', result.errors);
}
```

### Step 4: Verify Migration

```typescript
// Check backend has the data
const programs = await apiService.getPrograms();
console.log(`Backend has ${programs.length} programs`);

// Verify each program
for (const program of programs) {
  const masterImage = await apiService.getMasterImage(program.id);
  console.log(`Program ${program.name}: ${masterImage ? 'Has image' : 'No image'}`);
}
```

### Step 5: Rollback (if needed)

```typescript
// If something went wrong, restore from backup
const rolled_back = await MigrationManager.rollback();

if (rolled_back) {
  console.log('✓ Successfully restored from backup');
}
```

---

## Using the New Storage System

### Option 1: Direct API Service (Recommended for new code)

```typescript
import { apiService } from '@/lib/api-service';

// Get all programs
const programs = await apiService.getPrograms();

// Create program
const newProgram = await apiService.createProgram({
  name: 'My Program',
  config: {
    triggerType: 'internal',
    triggerInterval: 1000,
    // ... other config
  }
});

// Update program
await apiService.updateProgram(programId, {
  name: 'Updated Name'
});

// Delete program
await apiService.deleteProgram(programId);

// Upload master image
const blob = await fetch(imageUrl).then(r => r.blob());
await apiService.uploadMasterImage(programId, blob);
```

### Option 2: Storage Adapter (For backward compatibility)

```typescript
import { storageAdapter } from '@/lib/storage-adapter';

// Async methods with automatic fallback
const programs = await storageAdapter.getAllPrograms();
const program = await storageAdapter.getProgram(id);
await storageAdapter.saveProgram(program);
await storageAdapter.deleteProgram(id);

// Check current storage mode
const mode = await storageAdapter.getStorageMode();
console.log(`Using: ${mode}`); // 'api' or 'localStorage'
```

### Option 3: Legacy Storage (Deprecated, for backward compatibility)

```typescript
import { storage } from '@/lib/storage';

// Old synchronous API (localStorage only)
const programs = storage.getAllPrograms();
storage.saveProgram(program);
// ... etc
```

---

## Updating Components

### Before

```typescript
'use client';

import { storage } from '@/lib/storage';

export default function ProgramList() {
  const [programs, setPrograms] = useState([]);
  
  useEffect(() => {
    // Synchronous
    const data = storage.getAllPrograms();
    setPrograms(data);
  }, []);
  
  // ...
}
```

### After

```typescript
'use client';

import { apiService } from '@/lib/api-service';
import { storageAdapter } from '@/lib/storage-adapter';

export default function ProgramList() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPrograms();
  }, []);
  
  async function loadPrograms() {
    try {
      setLoading(true);
      // Async with automatic fallback
      const data = await storageAdapter.getAllPrograms();
      setPrograms(data);
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) return <div>Loading...</div>;
  
  // ...
}
```

---

## Backup & Restore

### Create Backup

```typescript
import { apiService } from '@/lib/api-service';

// Full backup with images
const backup = await apiService.exportBackup({
  includeImages: true,
  includeResults: true,
  includeSystemLogs: false,
  description: 'Weekly backup'
});

console.log(`Backup created: ${backup.backupId}`);
console.log(`Download: ${backup.downloadUrl}`);
```

### Download Backup

```typescript
// Trigger download
await apiService.downloadBackup(backupId);
```

### List Backups

```typescript
const backups = await apiService.listBackups(50);

backups.forEach(backup => {
  console.log(`${backup.backupId}: ${backup.programCount} programs`);
});
```

### Restore from Backup

```typescript
// Upload backup file
const file = event.target.files[0];

// Dry run first
const dryRun = await apiService.importBackup(file, false, true);
console.log('Would import:', dryRun);

// Actual import
const result = await apiService.importBackup(file, false, false);
console.log(`Imported ${result.imported.programs} programs`);
```

---

## Troubleshooting

### Migration fails with "Backend unavailable"

**Solution**: Ensure backend server is running

```bash
cd backend
python app.py
```

### Migration partially succeeds

**Solution**: Check error details and retry

```typescript
const result = await MigrationManager.migrate({
  continueOnError: true
});

// Review errors
result.errors.forEach(err => {
  console.error(`Program: ${err.program}, Error: ${err.error}`);
});
```

### Need to rollback migration

**Solution**: Use rollback utility

```typescript
await MigrationManager.rollback();
```

### Backend is slow or unresponsive

**Solution**: System automatically falls back to localStorage

```typescript
// Force check
const mode = await storageAdapter.getStorageMode();

if (mode === 'localStorage') {
  console.warn('Operating in offline mode');
}
```

---

## Best Practices

### 1. Always Use Async/Await

```typescript
// ✓ Good
const programs = await storageAdapter.getAllPrograms();

// ✗ Bad
const programs = storage.getAllPrograms(); // Synchronous, localStorage only
```

### 2. Handle Loading States

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function load() {
    setLoading(true);
    try {
      const data = await storageAdapter.getAllPrograms();
      setPrograms(data);
    } finally {
      setLoading(false);
    }
  }
  load();
}, []);
```

### 3. Handle Errors Gracefully

```typescript
try {
  await apiService.createProgram(data);
} catch (error) {
  // Show user-friendly error
  toast.error('Failed to create program. Please try again.');
  console.error(error);
}
```

### 4. Invalidate Cache After Mutations

```typescript
// Cache is automatically invalidated by apiService, but you can force it
await apiService.createProgram(data);
await storageAdapter.getAllPrograms(); // Will fetch fresh data
```

### 5. Regular Backups

```typescript
// Scheduled backup (e.g., daily)
async function scheduledBackup() {
  try {
    const backup = await apiService.exportBackup({
      includeImages: true,
      includeResults: true,
      description: `Auto backup ${new Date().toISOString()}`
    });
    console.log('Backup created:', backup.backupId);
  } catch (error) {
    console.error('Backup failed:', error);
  }
}
```

---

## Migration UI Component Example

```typescript
'use client';

import { useState } from 'react';
import { MigrationManager } from '@/lib/migration-utility';
import { Button } from '@/components/ui/button';

export function MigrationDialog() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState(null);
  
  const status = MigrationManager.checkMigrationStatus();
  
  if (!status.needed) return null;
  
  async function handleMigrate() {
    setMigrating(true);
    try {
      const result = await MigrationManager.migrate();
      setResult(result);
    } finally {
      setMigrating(false);
    }
  }
  
  return (
    <div className="p-6 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        Data Migration Available
      </h3>
      <p className="mb-4">
        We found {status.programCount} program(s) that can be migrated
        to the new storage system for better reliability.
      </p>
      
      <Button 
        onClick={handleMigrate} 
        disabled={migrating}
      >
        {migrating ? 'Migrating...' : 'Migrate Now'}
      </Button>
      
      {result && (
        <div className="mt-4">
          {result.success ? (
            <p className="text-green-600">
              ✓ Successfully migrated {result.programsMigrated} programs
            </p>
          ) : (
            <p className="text-red-600">
              ✗ Migration failed: {result.errors.length} error(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Testing

### Unit Tests

```typescript
import { MigrationManager } from '@/lib/migration-utility';

describe('MigrationManager', () => {
  test('detects localStorage data', () => {
    // Setup test data
    localStorage.setItem('vision_programs', JSON.stringify([
      { id: '1', name: 'Test Program' }
    ]));
    
    const status = MigrationManager.checkMigrationStatus();
    expect(status.needed).toBe(true);
    expect(status.programCount).toBe(1);
  });
  
  test('performs dry run migration', async () => {
    const result = await MigrationManager.migrate({ dryRun: true });
    expect(result.success).toBe(true);
  });
});
```

---

## Performance Considerations

### Caching

- Programs: 5 minutes
- Master images: 30 minutes
- Results: 1 minute

### Request Optimization

- Request deduplication
- Retry with exponential backoff
- Timeout: 30 seconds
- Automatic fallback

---

## Security

- All API requests use HTTPS in production
- Authentication tokens (when auth is enabled)
- Input validation on backend
- File upload size limits
- SQL injection prevention (parameterized queries)

---

## Support

For issues or questions:
1. Check this guide
2. Review error logs
3. Try rollback if needed
4. Contact development team

---

## Changelog

### Version 1.1.0 (2025-10-08)
- ✅ Added API service layer
- ✅ Added migration utility
- ✅ Added storage adapter with fallback
- ✅ Added backup/restore functionality
- ✅ Added database versioning
- ✅ Maintained backward compatibility
