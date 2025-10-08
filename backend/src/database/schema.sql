-- Vision Inspection System Database Schema

-- Programs table - stores inspection program configurations
CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_run DATETIME,
    total_inspections INTEGER DEFAULT 0,
    ok_count INTEGER DEFAULT 0,
    ng_count INTEGER DEFAULT 0,
    config_json TEXT NOT NULL,  -- JSON string of full program configuration
    master_image_path TEXT,
    is_active BOOLEAN DEFAULT 1,
    description TEXT
);

-- Tools table - stores individual tool configurations (normalized for querying)
CREATE TABLE IF NOT EXISTS tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    tool_type TEXT NOT NULL,  -- outline, area, color_area, edge_detection, position_adjust
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    roi_x INTEGER NOT NULL,
    roi_y INTEGER NOT NULL,
    roi_width INTEGER NOT NULL,
    roi_height INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    upper_limit INTEGER,
    parameters_json TEXT,  -- Additional tool-specific parameters
    tool_order INTEGER NOT NULL,  -- Processing order
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- Inspection results table - stores execution history
CREATE TABLE IF NOT EXISTS inspection_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    overall_status TEXT NOT NULL,  -- OK or NG
    processing_time_ms REAL NOT NULL,
    tool_results_json TEXT NOT NULL,  -- JSON array of tool results
    image_path TEXT,  -- Optional: path to captured image
    trigger_type TEXT,  -- internal or external
    notes TEXT,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
);

-- System logs table - stores system events and errors
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT NOT NULL,  -- INFO, WARNING, ERROR, CRITICAL
    category TEXT NOT NULL,  -- camera, gpio, inspection, api, etc.
    message TEXT NOT NULL,
    details_json TEXT,  -- Additional context as JSON
    program_id INTEGER,
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(is_active);
CREATE INDEX IF NOT EXISTS idx_tools_program ON tools(program_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_program ON inspection_results(program_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_timestamp ON inspection_results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_results_status ON inspection_results(overall_status);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_programs_timestamp 
AFTER UPDATE ON programs
FOR EACH ROW
BEGIN
    UPDATE programs SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Create view for program statistics
CREATE VIEW IF NOT EXISTS program_stats AS
SELECT 
    p.id,
    p.name,
    p.total_inspections,
    p.ok_count,
    p.ng_count,
    CASE 
        WHEN p.total_inspections > 0 
        THEN ROUND(CAST(p.ok_count AS REAL) / p.total_inspections * 100, 2)
        ELSE 0 
    END as success_rate,
    p.last_run,
    COUNT(DISTINCT t.id) as tool_count,
    p.created_at,
    p.updated_at,
    p.is_active
FROM programs p
LEFT JOIN tools t ON p.id = t.program_id
GROUP BY p.id;

