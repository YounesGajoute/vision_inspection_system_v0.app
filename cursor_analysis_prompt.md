# CURSOR AI - COMPREHENSIVE PROJECT ANALYSIS PROMPT

## OBJECTIVE
Perform a complete analysis of the Vision Inspection System v0 application and generate a detailed report covering architecture, implementation status, code quality, gaps, and recommendations.

---

## ANALYSIS INSTRUCTIONS

You are tasked with analyzing a **Vision Inspection System** designed for Raspberry Pi with HQ Camera. This is a production-grade machine vision application for industrial quality control.

### YOUR TASK:
1. **Scan and analyze the entire codebase**
2. **Evaluate architecture and structure**
3. **Identify implemented vs missing components**
4. **Assess code quality and patterns**
5. **Generate a comprehensive report**

---

## PROJECT CONTEXT

### System Overview
- **Purpose**: Vision-based inspection system for automated quality control
- **Target Platform**: Raspberry Pi 4 with HQ Camera Module
- **Technology Stack**: 
  - Backend: Python/Flask with OpenCV
  - Frontend: Next.js/React/TypeScript
  - Hardware: GPIO, Camera, LED control
  - Database: SQLite

### Expected Architecture (Based on Structure)
```
vision_inspection_system/
├── app.py                  # Flask entry point
├── wsgi.py                 # Production server config
├── requirements.txt        # Python dependencies
├── config.yaml            # System configuration
├── src/                   # Backend source
│   ├── api/              # REST + WebSocket API
│   ├── core/             # Business logic
│   ├── tools/            # Vision tools
│   ├── hardware/         # Hardware abstraction
│   ├── utils/            # Utilities
│   └── models/           # Data models
├── database/             # Database management
├── storage/              # Image storage
├── web/                  # Next.js frontend
├── tests/                # Test suite
├── scripts/              # Utility scripts
├── docs/                 # Documentation
└── systemd/              # Service files
```

---

## ANALYSIS CHECKLIST

### 1. PROJECT STRUCTURE ANALYSIS

**Evaluate:**
- [ ] Does the actual directory structure match the expected architecture?
- [ ] Are all critical directories present?
- [ ] Is the structure logical and maintainable?
- [ ] Are there any unexpected or redundant files/folders?

**Report:**
- Actual vs expected structure comparison
- Missing directories/files
- Structural issues or improvements needed

---

### 2. BACKEND ANALYSIS (Python/Flask)

#### 2.1 Core Application Files
**Check for:**
- [ ] `app.py` - Flask application initialization
- [ ] `wsgi.py` - Production server configuration
- [ ] `requirements.txt` - Python dependencies
- [ ] `config.yaml` - Configuration management

**Analyze:**
- Implementation completeness
- Configuration management approach
- Error handling
- Logging setup

#### 2.2 API Layer (`src/api/`)
**Check for:**
- [ ] `routes.py` - RESTful endpoints
- [ ] `websocket.py` - WebSocket handlers
- [ ] `middleware.py` - Auth, CORS, validation

**Evaluate:**
- API endpoint coverage
- Request/response handling
- Error handling and validation
- WebSocket implementation for real-time updates
- API documentation

**Required Endpoints:**
```
GET  /api/programs          - List programs
POST /api/programs          - Create program
GET  /api/programs/{id}     - Get program
PUT  /api/programs/{id}     - Update program
DELETE /api/programs/{id}   - Delete program
POST /api/capture           - Capture image
POST /api/inspect           - Run inspection
GET  /api/results/{id}      - Get results
GET  /api/history           - Get history
POST /api/calibrate         - Camera calibration
WebSocket /ws               - Real-time updates
```

#### 2.3 Core Business Logic (`src/core/`)
**Check for:**
- [ ] `inspection_engine.py` - Main controller
- [ ] `program_manager.py` - Program CRUD
- [ ] `trigger_controller.py` - Trigger management
- [ ] `judgment_logic.py` - OK/NG decisions
- [ ] `auto_tuning.py` - ML-based tuning

**Evaluate:**
- Algorithm implementation
- State management
- Performance considerations
- Thread safety for real-time operations

#### 2.4 Vision Tools (`src/tools/`)
**Check for:**
- [ ] `base_tool.py` - Abstract base class
- [ ] `outline_tool.py` - Shape matching
- [ ] `area_tool.py` - Area calculation
- [ ] `color_area_tool.py` - Color-based detection
- [ ] `edge_detection_tool.py` - Edge pixel counting
- [ ] `position_adjustment.py` - Position correction

**Evaluate:**
- OpenCV implementation quality
- Tool configurability
- Performance optimization
- Error handling
- Documentation

#### 2.5 Hardware Abstraction (`src/hardware/`)
**Check for:**
- [ ] `camera.py` - Camera interface (Picamera2)
- [ ] `gpio_controller.py` - GPIO management
- [ ] `led_controller.py` - Lighting control
- [ ] `io_monitor.py` - I/O monitoring

**Evaluate:**
- Hardware abstraction quality
- Error handling for hardware failures
- Resource cleanup
- Thread safety

#### 2.6 Database Layer (`database/`)
**Check for:**
- [ ] `db_manager.py` - Database connection
- [ ] `schema.sql` - Database schema
- [ ] `migrations/` - Schema migrations

**Evaluate:**
- Database design
- Query efficiency
- Data models
- Migration strategy

---

### 3. FRONTEND ANALYSIS (Next.js/React)

#### 3.1 Core Files
**Check for:**
- [ ] `package.json` - Dependencies
- [ ] `next.config.js` - Next.js configuration
- [ ] `tsconfig.json` - TypeScript config
- [ ] `tailwind.config.ts` - Tailwind setup

#### 3.2 Application Structure
**Check for:**
- [ ] `app/page.tsx` - Main dashboard
- [ ] `app/configure/page.tsx` - Configuration wizard
- [ ] `app/run/page.tsx` - Inspection runtime
- [ ] `app/layout.tsx` - Root layout
- [ ] `components/` - Reusable components
- [ ] `lib/` - Utilities and storage

**Evaluate:**
- Component organization
- State management approach
- TypeScript usage
- UI/UX implementation

#### 3.3 Required Pages/Features
**Verify implementation of:**
- [ ] Dashboard with program list
- [ ] Configuration wizard (4-step process)
  - Step 1: Image optimization (trigger, brightness, focus)
  - Step 2: Master image registration
  - Step 3: Tool configuration (ROI drawing)
  - Step 4: Output assignment
- [ ] Run/Monitor page (live inspection)
- [ ] Image history viewer
- [ ] Statistics dashboard
- [ ] Settings/calibration

#### 3.4 Key Components
**Check for:**
- [ ] Camera preview component
- [ ] ROI drawing canvas
- [ ] Tool configuration panel
- [ ] Real-time inspection display
- [ ] GPIO output indicators
- [ ] Statistics charts
- [ ] Image history carousel

**Evaluate:**
- Component reusability
- Props/state management
- Performance (especially canvas operations)
- Accessibility

#### 3.5 API Integration
**Check for:**
- [ ] API service layer (`lib/api.ts` or similar)
- [ ] WebSocket connection management
- [ ] Error handling
- [ ] Loading states
- [ ] Real-time data updates

---

### 4. TESTING ANALYSIS (`tests/`)

**Check for:**
- [ ] `test_inspection_engine.py`
- [ ] `test_tools.py`
- [ ] `test_api.py`
- [ ] `test_hardware.py`

**Evaluate:**
- Test coverage
- Test quality
- Integration tests
- Hardware mock implementations

---

### 5. SCRIPTS AND UTILITIES (`scripts/`)

**Check for:**
- [ ] `setup_system.sh` - System initialization
- [ ] `backup_config.py` - Configuration backup
- [ ] `calibrate_camera.py` - Camera calibration
- [ ] `deploy.sh` - Deployment script

**Evaluate:**
- Script completeness
- Error handling
- Documentation

---

### 6. DOCUMENTATION ANALYSIS (`docs/`)

**Check for:**
- [ ] `API_REFERENCE.md`
- [ ] `HARDWARE_SETUP.md`
- [ ] `USER_MANUAL.md`
- [ ] `TROUBLESHOOTING.md`
- [ ] `README.md`

**Evaluate:**
- Documentation completeness
- Clarity and accuracy
- Up-to-date status

---

### 7. DEPLOYMENT CONFIGURATION

**Check for:**
- [ ] `systemd/vision-inspection.service`
- [ ] `systemd/vision-inspection-web.service`
- [ ] Docker configuration (if any)
- [ ] Environment variable management

---

### 8. CODE QUALITY ANALYSIS

**Evaluate across all code:**
- [ ] **Code organization** - Logical structure, modularity
- [ ] **Naming conventions** - Consistent, descriptive names
- [ ] **Error handling** - Try/catch, logging, graceful failures
- [ ] **Type safety** - TypeScript usage, Python type hints
- [ ] **Documentation** - Docstrings, comments, README files
- [ ] **Security** - Input validation, SQL injection prevention
- [ ] **Performance** - Efficient algorithms, resource management
- [ ] **Dependencies** - Up-to-date, necessary, minimal
- [ ] **Best practices** - Following framework conventions

---

### 9. CONFIGURATION MANAGEMENT

**Analyze:**
- [ ] `config.yaml` structure and completeness
- [ ] Environment variable usage
- [ ] Configuration validation
- [ ] Default values
- [ ] Documentation of config options

**Expected Configuration Sections:**
```yaml
system:
  debug: false
  log_level: INFO

hardware:
  camera:
    resolution: [1920, 1080]
    framerate: 30
  gpio:
    trigger_input: 17
    outputs: [22, 23, 24, 25]
  led:
    pin: 18
    brightness: 255

storage:
  master_images: storage/master_images
  image_history: storage/image_history
  history_size: 100

database:
  path: database/inspection.db

api:
  host: 0.0.0.0
  port: 5000
  cors_origins: ["*"]
```

---

### 10. INTEGRATION ANALYSIS

**Evaluate:**
- [ ] Frontend ↔ Backend communication
- [ ] Backend ↔ Hardware integration
- [ ] WebSocket real-time updates
- [ ] File storage and retrieval
- [ ] Database integration
- [ ] Configuration loading

---

## REPORT GENERATION

### Generate a report with the following sections:

## 1. EXECUTIVE SUMMARY
- Overall project status (% complete)
- Key strengths
- Critical issues
- Priority recommendations

## 2. ARCHITECTURE ASSESSMENT
- Current architecture overview
- Adherence to planned structure
- Design patterns used
- Architecture strengths/weaknesses

## 3. IMPLEMENTATION STATUS
### Backend
- Core application: [X/Y files] (% complete)
- API layer: [X/Y endpoints] (% complete)
- Business logic: [X/Y modules] (% complete)
- Vision tools: [X/Y tools] (% complete)
- Hardware layer: [X/Y modules] (% complete)
- Database: [Status]

### Frontend
- Pages: [X/Y] (% complete)
- Components: [X/Y] (% complete)
- API integration: [Status]
- State management: [Status]

### Infrastructure
- Testing: [Coverage %]
- Documentation: [% complete]
- Scripts: [X/Y] (% complete)
- Deployment: [Status]

## 4. DETAILED COMPONENT ANALYSIS
For each major component, provide:
- **Status**: Implemented / Partial / Missing
- **Quality**: Excellent / Good / Needs Improvement / Poor
- **Issues**: List specific problems
- **Recommendations**: Specific improvements

## 5. MISSING COMPONENTS
List all expected but missing:
- Files
- Functions
- Features
- Tests
- Documentation

## 6. CODE QUALITY REPORT
- **Strengths**: What's well done
- **Weaknesses**: What needs improvement
- **Technical Debt**: Issues to address
- **Security Concerns**: Vulnerabilities found
- **Performance Issues**: Bottlenecks identified

## 7. DEPENDENCY ANALYSIS
- All dependencies listed
- Outdated packages
- Security vulnerabilities
- Unnecessary dependencies

## 8. TESTING ASSESSMENT
- Test coverage %
- Missing test scenarios
- Test quality
- CI/CD status

## 9. DOCUMENTATION ASSESSMENT
- Existing documentation quality
- Missing documentation
- Documentation gaps
- API documentation status

## 10. DEPLOYMENT READINESS
- Production readiness score
- Deployment blockers
- Configuration completeness
- Monitoring/logging setup

## 11. PRIORITIZED ACTION ITEMS

### CRITICAL (Block production deployment)
1. [Issue] - Impact, Effort, Priority

### HIGH (Needed before production)
1. [Issue] - Impact, Effort, Priority

### MEDIUM (Improve functionality)
1. [Issue] - Impact, Effort, Priority

### LOW (Nice to have)
1. [Issue] - Impact, Effort, Priority

## 12. RECOMMENDATIONS
- Architecture improvements
- Refactoring priorities
- Feature completions
- Testing strategy
- Documentation improvements
- Deployment strategy

## 13. RISK ASSESSMENT
- Technical risks
- Security risks
- Performance risks
- Deployment risks
- Mitigation strategies

## 14. ESTIMATED COMPLETION EFFORT
- Critical items: X hours/days
- High priority: X hours/days
- Medium priority: X hours/days
- Total to production: X days/weeks

---

## OUTPUT FORMAT

Please provide the analysis in the following format:

```markdown
# VISION INSPECTION SYSTEM v0 - COMPREHENSIVE ANALYSIS REPORT
Generated: [Date]
Analyzer: Cursor AI

[Include all 14 sections as detailed above]

---

## APPENDICES

### A. File Inventory
Complete list of all files found with status

### B. Code Metrics
- Lines of code
- File counts by type
- Complexity metrics

### C. Dependency Tree
Full dependency graph

### D. API Endpoint Coverage Matrix
Expected vs Implemented endpoints
```

---

## ADDITIONAL ANALYSIS REQUESTS

1. **Create visual diagrams** (if possible):
   - Architecture diagram
   - Data flow diagram
   - Component interaction diagram

2. **Generate lists**:
   - All TODO/FIXME comments found
   - All deprecated code
   - All console.log/print statements (potential debug code)

3. **Security scan**:
   - Hardcoded credentials
   - SQL injection vulnerabilities
   - XSS vulnerabilities
   - Insecure configurations

4. **Performance analysis**:
   - Potential bottlenecks
   - Inefficient algorithms
   - Memory leaks
   - Resource management issues

---

## SPECIAL FOCUS AREAS

### Camera Integration
Verify implementation of:
- Picamera2 integration
- Image capture modes (internal/external trigger)
- Brightness modes (normal/HDR/high-gain)
- Focus control
- Image buffering

### Vision Tools
Verify implementation of:
- Template matching (outline tool)
- Area calculation with thresholds
- Color-based detection with HSV
- Edge detection with pixel counting
- Position adjustment with template matching

### Real-time Performance
Analyze:
- Inspection cycle time capability
- WebSocket update frequency
- Image processing optimization
- Threading/async implementation

### GPIO Integration
Verify:
- Input trigger handling
- Output control for OK/NG/Tool results
- Debouncing
- Error handling

---

## COMPLETION CHECKLIST

Before submitting the report, ensure:
- [ ] All sections completed
- [ ] Specific examples provided for issues
- [ ] File paths included for references
- [ ] Code snippets included where relevant
- [ ] Recommendations are actionable
- [ ] Priorities are clear
- [ ] Effort estimates provided
- [ ] No generic statements (be specific)

---

## BEGIN ANALYSIS

Start your comprehensive analysis now. Be thorough, specific, and critical. Identify both what's working well and what needs improvement. Provide concrete examples and actionable recommendations.