"""Database Manager for Vision Inspection System"""

import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from contextlib import contextmanager
import threading


class DatabaseManager:
    """
    Manages all database operations with connection pooling and thread safety.
    Provides CRUD operations for programs, tools, and inspection results.
    """
    
    def __init__(self, db_path: str):
        """
        Initialize database manager.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self._local = threading.local()
        self._lock = threading.Lock()
        
        # Ensure database directory exists
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
        # Initialize database schema
        self._init_schema()
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get thread-local database connection."""
        if not hasattr(self._local, 'connection'):
            self._local.connection = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=10.0
            )
            self._local.connection.row_factory = sqlite3.Row
            # Enable foreign keys
            self._local.connection.execute("PRAGMA foreign_keys = ON")
        return self._local.connection
    
    @contextmanager
    def _get_cursor(self):
        """Context manager for database cursor with automatic commit/rollback."""
        conn = self._get_connection()
        cursor = conn.cursor()
        try:
            yield cursor
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def _init_schema(self):
        """Initialize database schema from SQL file."""
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        
        if not os.path.exists(schema_path):
            raise FileNotFoundError(f"Schema file not found: {schema_path}")
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        with self._get_cursor() as cursor:
            cursor.executescript(schema_sql)
    
    # ==================== PROGRAM OPERATIONS ====================
    
    def create_program(self, name: str, config: Dict) -> int:
        """
        Create a new inspection program.
        
        Args:
            name: Program name (must be unique)
            config: Program configuration dictionary
            
        Returns:
            Program ID
            
        Raises:
            ValueError: If program name already exists
        """
        config_json = json.dumps(config)
        
        try:
            with self._get_cursor() as cursor:
                cursor.execute("""
                    INSERT INTO programs (name, config_json, master_image_path)
                    VALUES (?, ?, ?)
                """, (name, config_json, config.get('masterImage')))
                
                program_id = cursor.lastrowid
                
                # Insert tools if present
                if 'tools' in config and config['tools']:
                    self._insert_tools(cursor, program_id, config['tools'])
                
                return program_id
                
        except sqlite3.IntegrityError:
            raise ValueError(f"Program with name '{name}' already exists")
    
    def _insert_tools(self, cursor: sqlite3.Cursor, program_id: int, tools: List[Dict]):
        """Insert tools for a program."""
        for order, tool in enumerate(tools):
            roi = tool['roi']
            cursor.execute("""
                INSERT INTO tools (
                    program_id, tool_type, name, color,
                    roi_x, roi_y, roi_width, roi_height,
                    threshold, upper_limit, parameters_json, tool_order
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                program_id,
                tool['type'],
                tool['name'],
                tool['color'],
                roi['x'],
                roi['y'],
                roi['width'],
                roi['height'],
                tool['threshold'],
                tool.get('upperLimit'),
                json.dumps(tool.get('parameters', {})),
                order
            ))
    
    def get_program(self, program_id: int) -> Optional[Dict]:
        """
        Get program by ID.
        
        Args:
            program_id: Program ID
            
        Returns:
            Program dictionary or None if not found
        """
        with self._get_cursor() as cursor:
            cursor.execute("""
                SELECT 
                    p.*,
                    ps.success_rate,
                    ps.tool_count
                FROM programs p
                JOIN program_stats ps ON p.id = ps.id
                WHERE p.id = ?
            """, (program_id,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            program = dict(row)
            program['config'] = json.loads(program['config_json'])
            del program['config_json']
            
            return program
    
    def get_program_by_name(self, name: str) -> Optional[Dict]:
        """Get program by name."""
        with self._get_cursor() as cursor:
            cursor.execute("SELECT * FROM programs WHERE name = ?", (name,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            program = dict(row)
            program['config'] = json.loads(program['config_json'])
            del program['config_json']
            
            return program
    
    def list_programs(self, active_only: bool = True) -> List[Dict]:
        """
        List all programs.
        
        Args:
            active_only: If True, only return active programs
            
        Returns:
            List of program dictionaries
        """
        with self._get_cursor() as cursor:
            query = "SELECT * FROM program_stats"
            if active_only:
                query += " WHERE is_active = 1"
            query += " ORDER BY updated_at DESC"
            
            cursor.execute(query)
            rows = cursor.fetchall()
            
            programs = []
            for row in rows:
                program = dict(row)
                # Fetch full config for each program
                cursor.execute(
                    "SELECT config_json FROM programs WHERE id = ?",
                    (program['id'],)
                )
                config_row = cursor.fetchone()
                if config_row:
                    program['config'] = json.loads(config_row['config_json'])
                programs.append(program)
            
            return programs
    
    def update_program(self, program_id: int, updates: Dict) -> bool:
        """
        Update program configuration.
        
        Args:
            program_id: Program ID
            updates: Dictionary of fields to update
            
        Returns:
            True if successful, False if program not found
        """
        allowed_fields = ['name', 'config', 'master_image_path', 'is_active', 'description']
        
        update_fields = []
        values = []
        
        for field, value in updates.items():
            if field == 'config':
                update_fields.append('config_json = ?')
                values.append(json.dumps(value))
            elif field in allowed_fields:
                update_fields.append(f'{field} = ?')
                values.append(value)
        
        if not update_fields:
            return False
        
        values.append(program_id)
        
        with self._get_cursor() as cursor:
            # Update program
            cursor.execute(f"""
                UPDATE programs
                SET {', '.join(update_fields)}
                WHERE id = ?
            """, tuple(values))
            
            # If config was updated, update tools
            if 'config' in updates and 'tools' in updates['config']:
                # Delete existing tools
                cursor.execute("DELETE FROM tools WHERE program_id = ?", (program_id,))
                # Insert new tools
                self._insert_tools(cursor, program_id, updates['config']['tools'])
            
            return cursor.rowcount > 0
    
    def delete_program(self, program_id: int) -> bool:
        """
        Delete a program (soft delete by setting is_active=0).
        
        Args:
            program_id: Program ID
            
        Returns:
            True if successful
        """
        with self._get_cursor() as cursor:
            cursor.execute("""
                UPDATE programs SET is_active = 0 WHERE id = ?
            """, (program_id,))
            return cursor.rowcount > 0
    
    def hard_delete_program(self, program_id: int) -> bool:
        """Permanently delete a program and all associated data."""
        with self._get_cursor() as cursor:
            cursor.execute("DELETE FROM programs WHERE id = ?", (program_id,))
            return cursor.rowcount > 0
    
    # ==================== INSPECTION RESULTS ====================
    
    def log_inspection_result(
        self,
        program_id: int,
        status: str,
        processing_time_ms: float,
        tool_results: List[Dict],
        trigger_type: str,
        image_path: Optional[str] = None,
        notes: Optional[str] = None
    ) -> int:
        """
        Log an inspection result.
        
        Args:
            program_id: Program ID
            status: Overall status (OK or NG)
            processing_time_ms: Processing time in milliseconds
            tool_results: List of tool result dictionaries
            trigger_type: Trigger type (internal or external)
            image_path: Optional path to captured image
            notes: Optional notes
            
        Returns:
            Result ID
        """
        tool_results_json = json.dumps(tool_results)
        
        with self._get_cursor() as cursor:
            # Insert result
            cursor.execute("""
                INSERT INTO inspection_results (
                    program_id, overall_status, processing_time_ms,
                    tool_results_json, image_path, trigger_type, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                program_id, status, processing_time_ms,
                tool_results_json, image_path, trigger_type, notes
            ))
            
            result_id = cursor.lastrowid
            
            # Update program statistics
            cursor.execute("""
                UPDATE programs
                SET 
                    total_inspections = total_inspections + 1,
                    ok_count = ok_count + ?,
                    ng_count = ng_count + ?,
                    last_run = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                1 if status == 'OK' else 0,
                1 if status == 'NG' else 0,
                program_id
            ))
            
            return result_id
    
    def get_inspection_history(
        self,
        program_id: Optional[int] = None,
        limit: int = 100,
        status_filter: Optional[str] = None
    ) -> List[Dict]:
        """
        Get inspection history.
        
        Args:
            program_id: Optional program ID to filter by
            limit: Maximum number of results
            status_filter: Optional status filter (OK or NG)
            
        Returns:
            List of inspection result dictionaries
        """
        with self._get_cursor() as cursor:
            query = "SELECT * FROM inspection_results WHERE 1=1"
            params = []
            
            if program_id:
                query += " AND program_id = ?"
                params.append(program_id)
            
            if status_filter:
                query += " AND overall_status = ?"
                params.append(status_filter)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = dict(row)
                result['tool_results'] = json.loads(result['tool_results_json'])
                del result['tool_results_json']
                results.append(result)
            
            return results
    
    # ==================== SYSTEM LOGS ====================
    
    def log_event(
        self,
        level: str,
        category: str,
        message: str,
        details: Optional[Dict] = None,
        program_id: Optional[int] = None
    ):
        """
        Log a system event.
        
        Args:
            level: Log level (INFO, WARNING, ERROR, CRITICAL)
            category: Event category
            message: Log message
            details: Optional additional details as dictionary
            program_id: Optional associated program ID
        """
        details_json = json.dumps(details) if details else None
        
        with self._get_cursor() as cursor:
            cursor.execute("""
                INSERT INTO system_logs (level, category, message, details_json, program_id)
                VALUES (?, ?, ?, ?, ?)
            """, (level, category, message, details_json, program_id))
    
    def get_logs(
        self,
        level: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """Get system logs with optional filtering."""
        with self._get_cursor() as cursor:
            query = "SELECT * FROM system_logs WHERE 1=1"
            params = []
            
            if level:
                query += " AND level = ?"
                params.append(level)
            
            if category:
                query += " AND category = ?"
                params.append(category)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            
            logs = []
            for row in rows:
                log = dict(row)
                if log['details_json']:
                    log['details'] = json.loads(log['details_json'])
                del log['details_json']
                logs.append(log)
            
            return logs
    
    def close(self):
        """Close database connection."""
        if hasattr(self._local, 'connection'):
            self._local.connection.close()
            delattr(self._local, 'connection')


def init_database(config: Dict):
    """
    Initialize database from configuration.
    
    Args:
        config: Database configuration dictionary
        
    Returns:
        DatabaseManager instance
    """
    db_path = config.get('path', './database/vision.db')
    return DatabaseManager(db_path)


# Global database instance
_db_instance: Optional[DatabaseManager] = None


def get_db() -> DatabaseManager:
    """Get global database instance."""
    global _db_instance
    if _db_instance is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return _db_instance


def set_db(db: DatabaseManager):
    """Set global database instance."""
    global _db_instance
    _db_instance = db

