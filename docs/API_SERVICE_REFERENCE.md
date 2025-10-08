# API Service Reference

Complete reference for the API service layer.

---

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [API Methods](#api-methods)
4. [Error Handling](#error-handling)
5. [Caching](#caching)
6. [Examples](#examples)

---

## Overview

The API service provides a type-safe, robust interface for all backend communications.

### Features

- ✅ Automatic retry with exponential backoff
- ✅ Request timeout protection
- ✅ Built-in caching
- ✅ Automatic fallback to localStorage
- ✅ TypeScript type safety
- ✅ Request deduplication

### Import

```typescript
import { apiService } from '@/lib/api-service';
// or
import apiService from '@/lib/api-service';
```

---

## Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Default Settings

```typescript
API_BASE_URL = 'http://localhost:5000/api'
CACHE_ENABLED = true
RETRY_ATTEMPTS = 3
RETRY_DELAY = 1000  // ms
REQUEST_TIMEOUT = 30000  // 30 seconds
```

---

## API Methods

### Programs

#### getPrograms()

Get all programs from the backend.

```typescript
async getPrograms(activeOnly?: boolean): Promise<Program[]>
```

**Parameters:**
- `activeOnly` (optional): Filter for active programs only (default: `true`)

**Returns:** Array of Program objects

**Example:**
```typescript
const programs = await apiService.getPrograms();
console.log(`Found ${programs.length} programs`);

// Get all programs including inactive
const allPrograms = await apiService.getPrograms(false);
```

**Cache:** 5 minutes

---

#### getProgram()

Get a single program by ID.

```typescript
async getProgram(id: number): Promise<Program | null>
```

**Parameters:**
- `id`: Program ID

**Returns:** Program object or `null` if not found

**Example:**
```typescript
const program = await apiService.getProgram(123);

if (program) {
  console.log(`Program: ${program.name}`);
} else {
  console.log('Program not found');
}
```

**Cache:** 5 minutes

---

#### createProgram()

Create a new program.

```typescript
async createProgram(data: {
  name: string;
  config: ProgramConfig;
}): Promise<Program>
```

**Parameters:**
- `data.name`: Program name (must be unique)
- `data.config`: Program configuration object

**Returns:** Created Program object

**Throws:** Error if creation fails

**Example:**
```typescript
try {
  const newProgram = await apiService.createProgram({
    name: 'Production Line A',
    config: {
      triggerType: 'external',
      triggerInterval: 1000,
      triggerDelay: 100,
      brightnessMode: 'normal',
      focusValue: 50,
      masterImage: null,
      tools: [],
      outputs: {}
    }
  });
  
  console.log(`Created program with ID: ${newProgram.id}`);
} catch (error) {
  console.error('Failed to create program:', error.message);
}
```

**Cache Invalidation:** Invalidates `programs_*` cache

---

#### updateProgram()

Update an existing program.

```typescript
async updateProgram(id: number, updates: Partial<Program>): Promise<Program>
```

**Parameters:**
- `id`: Program ID
- `updates`: Partial Program object with fields to update

**Returns:** Updated Program object

**Throws:** Error if update fails or program not found

**Example:**
```typescript
await apiService.updateProgram(123, {
  name: 'Updated Name',
  config: {
    ...existingConfig,
    triggerInterval: 2000
  }
});
```

**Cache Invalidation:** Invalidates `programs_*` and `program_{id}` cache

---

#### deleteProgram()

Delete a program (soft delete).

```typescript
async deleteProgram(id: number): Promise<void>
```

**Parameters:**
- `id`: Program ID

**Returns:** void

**Throws:** Error if deletion fails

**Example:**
```typescript
try {
  await apiService.deleteProgram(123);
  console.log('Program deleted');
} catch (error) {
  console.error('Failed to delete program:', error.message);
}
```

**Cache Invalidation:** Invalidates `programs_*` and `program_{id}` cache

---

#### updateProgramStats()

Update program statistics (non-critical, doesn't throw on error).

```typescript
async updateProgramStats(id: number, stats: Partial<Program>): Promise<void>
```

**Parameters:**
- `id`: Program ID
- `stats`: Stats to update (totalInspections, okCount, ngCount, lastRun)

**Returns:** void

**Example:**
```typescript
await apiService.updateProgramStats(123, {
  totalInspections: 1500,
  okCount: 1450,
  ngCount: 50,
  lastRun: new Date().toISOString()
});
```

---

### Master Images

#### uploadMasterImage()

Upload a master image for a program.

```typescript
async uploadMasterImage(
  programId: number, 
  imageFile: Blob
): Promise<{ path: string; quality: any }>
```

**Parameters:**
- `programId`: Program ID
- `imageFile`: Image file as Blob

**Returns:** Object with `path` and `quality` information

**Throws:** Error if upload fails

**Example:**
```typescript
// From file input
const file = event.target.files[0];
const result = await apiService.uploadMasterImage(123, file);
console.log(`Image saved to: ${result.path}`);

// From canvas
canvas.toBlob(async (blob) => {
  const result = await apiService.uploadMasterImage(123, blob);
});

// From fetch
const blob = await fetch(imageUrl).then(r => r.blob());
await apiService.uploadMasterImage(123, blob);
```

**Cache Invalidation:** Invalidates `master_image_{programId}` cache

---

#### getMasterImage()

Get master image for a program.

```typescript
async getMasterImage(programId: number): Promise<string | null>
```

**Parameters:**
- `programId`: Program ID

**Returns:** Base64 data URL string or `null` if no image

**Example:**
```typescript
const imageUrl = await apiService.getMasterImage(123);

if (imageUrl) {
  // Use in img tag
  <img src={imageUrl} alt="Master" />
} else {
  console.log('No master image');
}
```

**Cache:** 30 minutes

---

### Backup & Restore

#### exportBackup()

Create a complete system backup.

```typescript
async exportBackup(options?: BackupExportOptions): Promise<BackupMetadata>
```

**Parameters:**
- `options.includeImages` (optional): Include master images (default: `true`)
- `options.includeResults` (optional): Include inspection results (default: `true`)
- `options.includeSystemLogs` (optional): Include system logs (default: `false`)
- `options.description` (optional): Backup description

**Returns:** BackupMetadata object with backup information

**Example:**
```typescript
const backup = await apiService.exportBackup({
  includeImages: true,
  includeResults: false,
  description: 'Before upgrade'
});

console.log(`Backup ID: ${backup.backupId}`);
console.log(`Size: ${backup.fileSize} bytes`);
console.log(`Programs: ${backup.programCount}`);
```

---

#### downloadBackup()

Trigger download of a backup file.

```typescript
async downloadBackup(backupId: string): Promise<void>
```

**Parameters:**
- `backupId`: Backup ID

**Example:**
```typescript
await apiService.downloadBackup('backup_20251008_103000_abc123');
// Browser download dialog will appear
```

---

#### importBackup()

Import data from a backup file.

```typescript
async importBackup(
  file: File, 
  overwrite?: boolean, 
  dryRun?: boolean
): Promise<MigrationResult>
```

**Parameters:**
- `file`: Backup file
- `overwrite` (optional): Overwrite existing programs (default: `false`)
- `dryRun` (optional): Test import without making changes (default: `false`)

**Returns:** MigrationResult with import statistics

**Example:**
```typescript
const file = event.target.files[0];

// Dry run first
const dryRun = await apiService.importBackup(file, false, true);
console.log(`Would import ${dryRun.imported.programs} programs`);

// Actual import
const result = await apiService.importBackup(file, false, false);
if (result.success) {
  console.log(`Imported ${result.imported.programs} programs`);
}
```

**Cache Invalidation:** Clears entire cache after successful import

---

#### listBackups()

List available backups.

```typescript
async listBackups(limit?: number): Promise<BackupMetadata[]>
```

**Parameters:**
- `limit` (optional): Maximum number of backups to return (default: `50`)

**Returns:** Array of BackupMetadata objects

**Example:**
```typescript
const backups = await apiService.listBackups(10);

backups.forEach(backup => {
  console.log(`${backup.createdAt}: ${backup.programCount} programs`);
});
```

---

#### deleteBackup()

Delete a backup.

```typescript
async deleteBackup(backupId: string): Promise<void>
```

**Parameters:**
- `backupId`: Backup ID

**Example:**
```typescript
await apiService.deleteBackup('backup_20251008_103000_abc123');
```

---

### Camera

#### captureImage()

Capture an image from the camera.

```typescript
async captureImage(
  brightnessMode?: string, 
  focusValue?: number
): Promise<{ image: string; quality: any }>
```

**Parameters:**
- `brightnessMode` (optional): `'normal'`, `'hdr'`, or `'highgain'` (default: `'normal'`)
- `focusValue` (optional): Focus value 0-100 (default: `50`)

**Returns:** Object with base64 `image` and `quality` metrics

**Example:**
```typescript
const capture = await apiService.captureImage('normal', 50);

// Display image
<img src={capture.image} alt="Captured" />

// Check quality
console.log(`Brightness: ${capture.quality.brightness}`);
console.log(`Focus score: ${capture.quality.focus}`);
```

---

### Health Check

#### checkHealth()

Check if backend API is available.

```typescript
async checkHealth(): Promise<boolean>
```

**Returns:** `true` if backend is healthy, `false` otherwise

**Example:**
```typescript
const isHealthy = await apiService.checkHealth();

if (isHealthy) {
  console.log('✓ Backend is available');
} else {
  console.warn('✗ Backend is unavailable');
}
```

---

### Cache Management

#### clearCache()

Clear all cached data.

```typescript
clearCache(): void
```

**Example:**
```typescript
apiService.clearCache();
console.log('Cache cleared');
```

---

#### invalidateCache()

Invalidate specific cache entries by pattern.

```typescript
invalidateCache(pattern?: string): void
```

**Parameters:**
- `pattern` (optional): Regex pattern to match cache keys

**Example:**
```typescript
// Invalidate all program caches
apiService.invalidateCache('program');

// Invalidate specific program
apiService.invalidateCache('program_123');

// Clear all
apiService.invalidateCache();
```

---

## Error Handling

### Error Types

All errors are thrown as `Error` objects with descriptive messages.

```typescript
try {
  await apiService.createProgram(data);
} catch (error) {
  if (error.message.includes('already exists')) {
    // Handle duplicate name
  } else if (error.message.includes('HTTP 500')) {
    // Handle server error
  } else {
    // Handle other errors
  }
}
```

### Common Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `Backend unavailable` | Backend server not running | Start backend server |
| `Program with name '...' already exists` | Duplicate program name | Use different name |
| `HTTP 404: Not found` | Resource doesn't exist | Check ID |
| `HTTP 500: Internal server error` | Server error | Check server logs |
| `Upload failed` | Image upload issue | Check file size/format |
| `Request timeout` | Request took > 30s | Check network/server |

### Retry Logic

The API service automatically retries failed requests:

- **Retry Count**: 3 attempts
- **Retry Delay**: 1 second (exponential backoff)
- **Retryable Errors**: Network errors, timeouts, 5xx errors

---

## Caching

### Cache Duration

| Resource | TTL | Key Pattern |
|----------|-----|-------------|
| Programs list | 5 min | `programs_{activeOnly}` |
| Single program | 5 min | `program_{id}` |
| Master image | 30 min | `master_image_{id}` |

### Cache Invalidation

Cache is automatically invalidated on:
- Create program → Invalidates `programs_*`
- Update program → Invalidates `programs_*` and `program_{id}`
- Delete program → Invalidates `programs_*` and `program_{id}`
- Upload image → Invalidates `master_image_{id}`
- Import backup → Clears all cache

### Manual Control

```typescript
// Clear everything
apiService.clearCache();

// Invalidate pattern
apiService.invalidateCache('program');
```

---

## Examples

### Complete CRUD Example

```typescript
import { apiService } from '@/lib/api-service';

async function programCrudExample() {
  // CREATE
  const program = await apiService.createProgram({
    name: 'Test Program',
    config: {
      triggerType: 'internal',
      triggerInterval: 1000,
      triggerDelay: 0,
      brightnessMode: 'normal',
      focusValue: 50,
      masterImage: null,
      tools: [],
      outputs: {}
    }
  });
  console.log('Created:', program.id);
  
  // READ
  const loaded = await apiService.getProgram(program.id);
  console.log('Loaded:', loaded.name);
  
  // UPDATE
  await apiService.updateProgram(program.id, {
    name: 'Updated Name'
  });
  console.log('Updated');
  
  // DELETE
  await apiService.deleteProgram(program.id);
  console.log('Deleted');
}
```

### Error Handling Example

```typescript
async function safeCreate(name: string, config: any) {
  try {
    const program = await apiService.createProgram({ name, config });
    return { success: true, program };
  } catch (error) {
    console.error('Failed to create program:', error);
    
    if (error.message.includes('already exists')) {
      return { 
        success: false, 
        error: 'A program with this name already exists' 
      };
    }
    
    return { 
      success: false, 
      error: 'Failed to create program. Please try again.' 
    };
  }
}
```

### Backup Workflow Example

```typescript
async function backupWorkflow() {
  // 1. Create backup
  const backup = await apiService.exportBackup({
    includeImages: true,
    includeResults: true,
    description: 'Pre-upgrade backup'
  });
  
  console.log(`Backup created: ${backup.backupId}`);
  
  // 2. Download backup
  await apiService.downloadBackup(backup.backupId);
  
  // 3. List all backups
  const backups = await apiService.listBackups();
  console.log(`Total backups: ${backups.length}`);
  
  // 4. Delete old backups (keep last 5)
  const oldBackups = backups.slice(5);
  for (const old of oldBackups) {
    await apiService.deleteBackup(old.backupId);
  }
}
```

---

## TypeScript Types

### Program

```typescript
interface Program {
  id: string;
  name: string;
  created: string;
  lastRun: string | null;
  totalInspections: number;
  okCount: number;
  ngCount: number;
  config: {
    triggerType: string;
    triggerInterval: number;
    triggerDelay: number;
    brightnessMode: string;
    focusValue: number;
    masterImage: string | null;
    tools: any[];
    outputs: Record<string, any>;
  };
}
```

### BackupMetadata

```typescript
interface BackupMetadata {
  backupId: string;
  timestamp: string;
  programCount: number;
  imageCount: number;
  resultCount: number;
  fileSize: number;
  description?: string;
}
```

### MigrationResult

```typescript
interface MigrationResult {
  dryRun: boolean;
  imported: {
    programs: number;
    images: number;
    results: number;
  };
  skipped: {
    programs: number;
    images: number;
  };
  errors: string[];
}
```

---

## Performance Tips

1. **Use cache effectively**: Don't clear cache unnecessarily
2. **Batch operations**: Group multiple updates when possible
3. **Lazy load images**: Only load master images when needed
4. **Handle errors gracefully**: Always wrap API calls in try-catch
5. **Show loading states**: API calls are async, indicate to users

---

## Testing

```typescript
import { apiService } from '@/lib/api-service';

// Mock API calls in tests
jest.mock('@/lib/api-service', () => ({
  apiService: {
    getPrograms: jest.fn(() => Promise.resolve([])),
    createProgram: jest.fn(() => Promise.resolve({ id: 1 }))
  }
}));

test('loads programs', async () => {
  const programs = await apiService.getPrograms();
  expect(programs).toEqual([]);
});
```

---

## Support

For issues or questions:
- Check error messages
- Review this documentation
- Check backend logs
- Contact development team
