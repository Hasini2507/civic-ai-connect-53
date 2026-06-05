const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, LevelFormat, ExternalHyperlink,
        PageNumber, PageBreak, HeadingLevel, WidthType, ShadingType, BorderStyle } = require('docx');

const fs = require('fs');

// Common styles
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };
const headerShade = { fill: '1E3A5F', type: ShadingType.CLEAR };
const altRowShade = { fill: 'F0F4F8', type: ShadingType.CLEAR };
const hdrText = { color: 'FFFFFF', bold: true, size: 22, font: 'Calibri' };
const bodyText = { size: 22, font: 'Calibri' };
const bodyTextSmall = { size: 20, font: 'Calibri' };

function makeCell(text, w, isHeader = false, options = {}) {
    const shading = isHeader ? headerShade : (options.alt ? altRowShade : undefined);
    const runs = [];
    if (options.bold) runs.push(new TextRun({ text, bold: true, size: 22, font: 'Calibri' }));
    else if (options.code) runs.push(new TextRun({ text, size: 18, font: 'Consolas', color: '2E75B6' }));
    else if (isHeader) runs.push(new TextRun({ ...hdrText, text }));
    else runs.push(new TextRun({ ...bodyText, text }));
    return new TableCell({
        borders: cellBorders,
        width: { size: w, type: WidthType.DXA },
        shading,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: runs })],
    });
}

function makeTable(rows, widths) {
    return new Table({
        width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
        columnWidths: widths,
        rows: rows.map((row, ri) => new TableRow({
            children: row.map((cell, ci) => makeCell(cell.text || cell, widths[ci], cell.header || false, { alt: ri % 2 === 1 })),
        })),
    });
}

const doc = new Document({
    styles: {
        default: { document: { run: { font: 'Calibri', size: 22 } } },
        paragraphStyles: [
            { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
              run: { size: 48, bold: true, color: '1E3A5F', font: 'Calibri' },
              paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
            { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
              run: { size: 32, bold: true, color: '2B547E', font: 'Calibri' },
              paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
            { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
              run: { size: 26, bold: true, color: '4A6B8A', font: 'Calibri' },
              paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
        ]
    },
    numbering: {
        config: [
            { reference: 'bullets',
              levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
            { reference: 'numbers',
              levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
        ]
    },
    sections: [{
        properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
        },
        headers: {
            default: new Header({ children: [
                new Paragraph({ children: [new TextRun({ text: 'CivicFlow AI — Technical Architecture & Implementation', size: 20, color: '888888', font: 'Calibri' })] }),
                new Paragraph({ border: { bottom: { style: 'single', size: 6, color: '1E3A5F', space: 1 } }, children: [] })
            ] })
        },
        footers: {
            default: new Footer({ children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [
                    new TextRun({ text: 'Page ', size: 18, color: '888888', font: 'Calibri' }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Calibri' }),
                ] })
            ] })
        },
        children: [
            // TITLE
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'CivicFlow AI', size: 56, bold: true, color: '1E3A5F', font: 'Calibri' })] }),
            new Paragraph({ children: [new TextRun({ text: 'Technical Architecture & Implementation Document', size: 28, color: '4A6B8A', font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Intelligent Civic Complaint Management & Resolution Platform', size: 22, italics: true, color: '666666', font: 'Calibri' })] }),
            new Paragraph({ children: [new TextRun({ text: 'Generated: June 5, 2026', size: 18, color: '888888', font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 300 }, children: [new TextRun({ text: 'Project ID: 9c0cdf21-4d84-4e72-8165-3e7c445f23d7', size: 18, color: '888888', font: 'Calibri' })] }),

            // 1. EXECUTIVE SUMMARY
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('1. Executive Summary')] }),
            new Paragraph({ children: [new TextRun({ text: 'CivicFlow AI is a production-ready, full-stack civic complaint management platform built entirely on the Lovable Cloud stack (React + TanStack Start + PostgreSQL + AI Gateway). It enables citizens to report civic issues with multimedia evidence and GPS tagging, while an AI-powered triage engine automatically categorizes, scores priority, detects duplicates, and routes complaints to the correct municipal department with SLA tracking.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: 'Key capabilities delivered in Slice 1 (Citizen Flow):', size: 22, bold: true, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Secure authentication with email/password + Google OAuth', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'AI complaint triage via Google Gemini 2.5 Flash (category, severity, priority score, department routing)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'GPS-tagged complaint submission with image/video/audio evidence', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Duplicate detection within ~120m radius, 30-day window with auto-supporter linking', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'SLA auto-calculation based on category (12h to 72h resolution windows)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Interactive Leaflet map with priority-colored pins and status filtering', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Anonymous reporting (identity hidden from officers, verified by auth system)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Role-based access control (citizen, officer, supervisor, engineer, commissioner, admin)', size: 22, font: 'Calibri' })] }),

            // 2. TECH STACK
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('2. Technology Stack')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.1 Frontend')] }),
            makeTable([
                [{text:'Technology',header:true},{text:'Version',header:true},{text:'Purpose',header:true}],
                ['React','19.2.0','UI library with concurrent features'],
                ['TanStack Start','1.167.50','Full-stack React framework (SSR/SSG, file-based routing, server functions)'],
                ['TanStack Router','1.168.25','Type-safe file-based routing with route params'],
                ['TanStack Query','5.83.0','Server state management, caching, data fetching'],
                ['Tailwind CSS','4.2.1','Utility-first CSS with oklch design tokens'],
                ['shadcn/ui','Latest (New York)','Accessible UI primitives (Button, Dialog, Select, Switch, etc.)'],
                ['Lucide React','0.575.0','Consistent icon system'],
                ['Leaflet + react-leaflet','1.9.4 / 5.0.0','Interactive maps with OpenStreetMap tiles'],
                ['Recharts','2.15.4','Data visualization (reserved for analytics module)'],
                ['Sonner','2.0.7','Toast notifications'],
                ['Zod','3.24.2','Input validation schema (server + client)'],
            ], [2400, 1800, 5160]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.2 Backend & Database')] }),
            makeTable([
                [{text:'Technology',header:true},{text:'Role',header:true},{text:'Details',header:true}],
                ['Lovable Cloud (PostgreSQL)','Primary Database','Row-Level Security (RLS), triggers, stored functions, PostGIS-ready geo indices'],
                ['Supabase Auth','Authentication','Email/password + Google OAuth, JWT sessions, auto profile creation via triggers'],
                ['Supabase Storage','File Storage','Private complaint-media bucket with signed URLs, RLS policies per user folder'],
                ['TanStack Server Functions','Application Logic','createServerFn RPC (typed, middleware-protected) replacing traditional REST API'],
                ['Lovable AI Gateway','AI Orchestration','Unified proxy to Google Gemini 2.5 Flash, GPT models, and image generation'],
            ], [2400, 2400, 4560]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('2.3 DevOps & Tooling')] }),
            makeTable([
                [{text:'Tool',header:true},{text:'Purpose',header:true}],
                ['Vite 7.3.1','Build tool, dev server, SSR entry points'],
                ['TypeScript 5.8.3','Strict type checking, path aliases (@/*)'],
                ['ESLint + Prettier','Linting and formatting'],
                ['Bun','Package manager and script runner'],
                ['Cloudflare Workers (Edge)','Serverless runtime for SSR and server functions'],
            ], [3000, 6360]),

            // 3. ARCHITECTURE
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('3. System Architecture')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.1 High-Level Architecture')] }),
            new Paragraph({ children: [new TextRun({ text: 'CivicFlow AI follows a modern edge-first full-stack architecture:', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Client Layer: React 19 SPA with TanStack Router and TanStack Query for state management.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Server Layer: TanStack Start server functions (createServerFn) running on Cloudflare Workers edge runtime.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Data Layer: PostgreSQL via Lovable Cloud with Row-Level Security, triggers, and stored functions.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'AI Layer: Lovable AI Gateway proxying to Google Gemini 2.5 Flash for complaint triage.', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.2 Authentication & Authorization Flow')] }),
            new Paragraph({ children: [new TextRun({ text: 'The auth system uses Supabase Auth with multi-provider support:', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Email/Password: Standard signup with email verification required (auto-confirm disabled for security)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Google OAuth: One-click social login via Lovable Cloud connector', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Auto Profile Creation: PostgreSQL trigger (handle_new_user) creates a profiles row and assigns citizen role on every new auth.users insert', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Role-Based Access: 6-tier role system (citizen, officer, supervisor, engineer, commissioner, admin) enforced via SECURITY DEFINER has_role() function and RLS policies', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('3.3 Request Flow: Complaint Submission')] }),
            new Paragraph({ children: [new TextRun({ text: 'The end-to-end citizen complaint submission flow:', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Citizen fills title, description, optional address, and toggles anonymous flag', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Evidence uploaded to Supabase Storage (complaint-media bucket) with signed URLs (up to 20MB per file)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'GPS coordinates captured via navigator.geolocation API', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'AI triage triggered: Gemini 2.5 Flash analyzes text + images, returns category, severity, priority_score, priority_level, summary, recommended_department', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'Duplicate detection: Query within ~120m bounding box (0.0011 degrees), same category, last 30 days, active statuses', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'If duplicate found: Insert supporter record (bump_supporter_count trigger increments supporter_count on complaints)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'numbers', level: 0 }, children: [new TextRun({ text: 'If new complaint: Insert into complaints table with SLA due date calculated from sla_configurations, insert media rows, create notification', size: 22, font: 'Calibri' })] }),

            // 4. DATABASE SCHEMA
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('4. Database Schema')] }),
            new Paragraph({ children: [new TextRun({ text: 'All tables reside in the public schema with Row-Level Security (RLS) enabled. Custom PostgreSQL types (enums) define domain constraints.', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.1 Custom Types (Enums)')] }),
            makeTable([
                [{text:'Type Name',header:true},{text:'Values',header:true}],
                ['app_role','citizen, officer, supervisor, engineer, commissioner, admin'],
                ['complaint_status','submitted, assigned, in_progress, resolved, verified, closed, rejected'],
                ['priority_level','low, medium, high, critical'],
                ['complaint_category','pothole, road_damage, drainage_blockage, water_leakage, garbage_overflow, streetlight_failure, open_manhole, fallen_tree, traffic_signal_damage, public_infrastructure_damage, other'],
                ['media_kind','image, video, audio'],
            ], [3000, 6360]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.2 Table: profiles')] }),
            new Paragraph({ children: [new TextRun({ text: 'Stores extended user information. Linked to auth.users via CASCADE DELETE.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true},{text:'Purpose',header:true}],
                ['id','UUID','PK, FK → auth.users(id), ON DELETE CASCADE','User identity link'],
                ['full_name','TEXT','nullable','Display name'],
                ['phone','TEXT','nullable','Contact number'],
                ['avatar_url','TEXT','nullable','Profile picture URL'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()','Account creation time'],
                ['updated_at','TIMESTAMPTZ','DEFAULT now()','Last update (auto via trigger)'],
            ], [2200, 1800, 2600, 2760]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.3 Table: user_roles')] }),
            new Paragraph({ children: [new TextRun({ text: 'Multi-role assignment per user. Uses has_role() SECURITY DEFINER function to avoid recursive RLS.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()'],
                ['user_id','UUID','NOT NULL, FK → auth.users(id), ON DELETE CASCADE'],
                ['role','app_role','NOT NULL'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
                ['','','UNIQUE (user_id, role)'],
            ], [2200, 1800, 5360]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.4 Table: departments')] }),
            new Paragraph({ children: [new TextRun({ text: 'Municipal departments for complaint routing. Seeded with 6 departments at migration time.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()'],
                ['name','TEXT','NOT NULL'],
                ['code','TEXT','NOT NULL, UNIQUE'],
                ['contact_email','TEXT','nullable'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
            ], [2200, 1800, 5360]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.5 Table: sla_configurations')] }),
            new Paragraph({ children: [new TextRun({ text: 'Per-category SLA windows. Used to auto-calculate sla_due_at on complaint insert.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()'],
                ['category','complaint_category','NOT NULL, UNIQUE'],
                ['hours_to_resolve','INT','NOT NULL'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
            ], [2200, 2200, 4960]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.6 Table: complaints (Core)')] }),
            new Paragraph({ children: [new TextRun({ text: 'The central entity. Geo-indexed for map queries. AI analysis stored as JSONB.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true},{text:'Purpose',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()','Unique complaint ID'],
                ['reporter_id','UUID','NOT NULL, FK → auth.users(id)','Citizen who reported'],
                ['is_anonymous','BOOLEAN','NOT NULL, DEFAULT false','Hide identity from officers'],
                ['title','TEXT','NOT NULL','Short description'],
                ['description','TEXT','NOT NULL','Detailed narrative'],
                ['category','complaint_category','NOT NULL, DEFAULT other','AI-derived or manual'],
                ['severity','TEXT','nullable','minor, moderate, severe, critical'],
                ['priority_score','INT','NOT NULL, DEFAULT 0','0-100 safety risk score'],
                ['priority_level','priority_level','NOT NULL, DEFAULT medium','low/medium/high/critical'],
                ['status','complaint_status','NOT NULL, DEFAULT submitted','Lifecycle state'],
                ['department_id','UUID','nullable, FK → departments(id)','Routed department'],
                ['assigned_officer_id','UUID','nullable, FK → auth.users(id)','Assigned officer'],
                ['latitude','DOUBLE PRECISION','nullable','GPS lat'],
                ['longitude','DOUBLE PRECISION','nullable','GPS lng'],
                ['address','TEXT','nullable','Street address'],
                ['supporter_count','INT','NOT NULL, DEFAULT 1','Citizens supporting this issue'],
                ['ai_analysis','JSONB','nullable','Full AI triage result'],
                ['sla_due_at','TIMESTAMPTZ','nullable','Auto-calculated deadline'],
                ['resolved_at','TIMESTAMPTZ','nullable','Resolution timestamp'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()','Submission time'],
                ['updated_at','TIMESTAMPTZ','DEFAULT now()','Auto-updated'],
            ], [2200, 2000, 2400, 2760]),
            new Paragraph({ children: [new TextRun({ text: 'Indices: complaints_status_idx, complaints_geo_idx (lat,lng), complaints_reporter_idx', size: 20, italics: true, color: '666666', font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.7 Table: complaint_media')] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()'],
                ['complaint_id','UUID','NOT NULL, FK → complaints(id), ON DELETE CASCADE'],
                ['kind','media_kind','NOT NULL'],
                ['storage_path','TEXT','NOT NULL'],
                ['public_url','TEXT','nullable (signed URL)'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
            ], [2200, 1800, 5360]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.8 Table: complaint_supporters')] }),
            new Paragraph({ children: [new TextRun({ text: 'Many-to-many linking citizens to complaints they support. bump_supporter_count trigger maintains denormalized count on complaints.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['complaint_id','UUID','NOT NULL, FK → complaints(id), ON DELETE CASCADE'],
                ['user_id','UUID','NOT NULL, FK → auth.users(id), ON DELETE CASCADE'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
                ['','','PRIMARY KEY (complaint_id, user_id)'],
            ], [2200, 1800, 5360]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('4.9 Table: notifications')] }),
            makeTable([
                [{text:'Column',header:true},{text:'Type',header:true},{text:'Constraints',header:true}],
                ['id','UUID','PK, DEFAULT gen_random_uuid()'],
                ['user_id','UUID','NOT NULL, FK → auth.users(id), ON DELETE CASCADE'],
                ['complaint_id','UUID','nullable, FK → complaints(id)'],
                ['title','TEXT','NOT NULL'],
                ['body','TEXT','nullable'],
                ['read_at','TIMESTAMPTZ','nullable'],
                ['created_at','TIMESTAMPTZ','DEFAULT now()'],
            ], [2200, 1800, 5360]),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Index: notif_user_idx (user_id, created_at DESC) for inbox-style reads.', size: 20, italics: true, color: '666666', font: 'Calibri' })] }),

            // 5. AI TRIAGE ENGINE
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('5. AI Triage Engine')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.1 Model & Gateway')] }),
            new Paragraph({ children: [new TextRun({ text: 'The AI triage engine uses Google Gemini 2.5 Flash via the Lovable AI Gateway. Input validation uses Zod schemas. The system prompt instructs the model to behave as a civic-issue triage AI, favoring public-safety urgency.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.2 Input Schema (Zod)')] }),
            new Paragraph({ children: [new TextRun({ text: 'title: string (1-200 chars), description: string (1-4000 chars), imageUrls: array of URLs (max 4), latitude/longitude: optional numbers', size: 22, font: 'Calibri' })] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.3 Output Schema')] }),
            makeTable([
                [{text:'Field',header:true},{text:'Type',header:true},{text:'Description',header:true}],
                ['category','enum','One of 11 complaint categories'],
                ['severity','enum','minor / moderate / severe / critical'],
                ['priority_score','integer (0-100)','Public safety risk quantification'],
                ['priority_level','enum','low / medium / high / critical (derived from score)'],
                ['summary','string','One-line AI-generated description'],
                ['recommended_department','enum','road / water / electricity / sanitation / sewerage / municipal'],
            ], [2400, 2400, 4560]),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('5.4 Fallback & Resilience')] }),
            new Paragraph({ children: [new TextRun({ text: 'If the AI Gateway is unavailable (429 rate limit, 402 credits exhausted, network error), the system falls back to a heuristic keyword-matching classifier that scans the title + description for category keywords. This ensures 100% uptime for complaint submission.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Error codes returned: rate_limited, credits_exhausted, ai_error, ai_exception — logged server-side for monitoring.', size: 22, font: 'Calibri' })] }),

            // 6. SECURITY
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('6. Security Architecture')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('6.1 Row-Level Security (RLS)')] }),
            new Paragraph({ children: [new TextRun({ text: 'Every table has RLS enabled with granular policies:', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'profiles: Citizens can only read/update their own profile. Admins get full access via service_role.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'complaints: All authenticated users can read (public civic data). Only reporters can insert. Update allowed for reporter OR any staff role (officer, supervisor, engineer, commissioner, admin).', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'complaint_media: Read for all authenticated. Insert only for own complaint. Delete by reporter or admin.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'user_roles: Read-only for authenticated (own roles only). No direct insert/update via client — managed by triggers and server functions.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Storage (complaint-media bucket): Read for all authenticated. Insert/delete restricted to files within the user\'s own folder (auth.uid()::text prefix).', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('6.2 Authentication Middleware')] }),
            new Paragraph({ children: [new TextRun({ text: 'The attachSupabaseAuth middleware (registered in src/start.ts functionMiddleware) automatically reads the user session from localStorage and attaches an Authorization: Bearer <token> header to every serverFn RPC call. On the server, requireSupabaseAuth middleware validates the token and provides an authenticated Supabase client scoped to the user.', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Server-side admin operations use the supabaseAdmin client (service_role key) which bypasses RLS — restricted to trusted server functions only.', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('6.3 Anonymous Reporting')] }),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'Anonymous mode hides the reporter identity from officers and the public. The reporter_id is still stored in the database (for status notifications and duplicate detection), but the UI conditionally redacts it when is_anonymous = true. Admins retain full visibility for audit and anti-spam purposes.', size: 22, font: 'Calibri' })] }),

            // 7. PROJECT STRUCTURE
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('7. Project Structure')] }),
            new Paragraph({ children: [new TextRun({ text: 'Source code is organized under src/ following TanStack Start conventions:', size: 22, font: 'Calibri' })] }),
            new Paragraph({ children: [new TextRun({ text: 'src/', bold: true, size: 22, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'components/          — Reusable UI components (AppHeader, LeafletMap, StatusBadge)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'components/ui/       — shadcn/ui primitives (Button, Dialog, Input, Select, etc.)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'hooks/             — Custom React hooks (useAuth, useMobile)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'integrations/        — Third-party clients', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'lovable/         — Lovable Cloud auth connector', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'supabase/        — Supabase clients (browser, server, auth middleware, types)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'lib/               — Utilities and business logic', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'civic.ts         — Constants: categories, status/priority color maps, labels', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'ai.functions.ts  — Server function: analyzeComplaint (AI triage)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'config.server.ts — Server-only environment config', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: 'routes/            — TanStack file-based routing', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: '__root.tsx      — Root layout (QueryClientProvider, auth state listener, Toaster)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'index.tsx        — Landing page (marketing hero, features, how-it-works)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: 'auth.tsx         — Authentication page (sign in / sign up)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 720 }, children: [new TextRun({ text: '_authenticated/  — Protected route group (beforeLoad auth guard)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'route.tsx        — Auth layout wrapper (AppHeader + Outlet)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'dashboard.tsx    — Citizen dashboard (stats, recent reports)', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'submit.tsx       — Complaint submission form with AI preview', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'complaints.tsx   — Full complaints list for citizen', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'complaints.$id.tsx — Individual complaint detail view', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'map.tsx          — Live map with priority-colored pins', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ indent: { left: 1080 }, children: [new TextRun({ text: 'profile.tsx      — User profile management', size: 20, font: 'Consolas', color: '2E75B6' })] }),
            new Paragraph({ spacing: { after: 200 }, indent: { left: 360 }, children: [new TextRun({ text: 'styles.css         — Tailwind v4 theme tokens (oklch color system, dark mode)', size: 20, font: 'Consolas', color: '2E75B6' })] }),

            // 8. ROUTES
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('8. API Routes & Server Functions')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('8.1 File-Based Routes')] }),
            makeTable([
                [{text:'Route File',header:true},{text:'URL Path',header:true},{text:'Access',header:true},{text:'Purpose',header:true}],
                ['index.tsx','/','Public','Marketing landing page'],
                ['auth.tsx','/auth','Public','Sign in / Sign up (email + Google OAuth)'],
                ['forgot-password.tsx','/forgot-password','Public','Password reset request'],
                ['reset-password.tsx','/reset-password','Public','Password reset confirmation'],
                ['_authenticated/route.tsx','/* (layout)','Protected','Auth guard + AppHeader wrapper'],
                ['_authenticated/dashboard.tsx','/dashboard','Protected','Citizen dashboard with stats'],
                ['_authenticated/submit.tsx','/submit','Protected','Complaint submission + AI preview'],
                ['_authenticated/complaints.tsx','/complaints','Protected','Full complaints list'],
                ['_authenticated/complaints.$id.tsx','/complaints/:id','Protected','Complaint detail view'],
                ['_authenticated/map.tsx','/map','Protected','Interactive map with filters'],
                ['_authenticated/profile.tsx','/profile','Protected','User profile editing'],
            ], [2800, 2000, 1600, 2960]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('8.2 Server Functions (createServerFn)')] }),
            makeTable([
                [{text:'Function',header:true},{text:'File',header:true},{text:'Method',header:true},{text:'Description',header:true}],
                ['analyzeComplaint','lib/ai.functions.ts','POST','AI triage: accepts title/description/images/location, returns category/severity/priority/department via Gemini 2.5 Flash'],
            ], [2600, 2600, 1600, 2560]),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'All data reads/writes for complaints, media, supporters, and notifications are performed directly via the Supabase browser client (with RLS enforcement) from React components using TanStack Query.', size: 22, font: 'Calibri' })] }),

            // 9. DESIGN SYSTEM
            new Paragraph({ children: [new PageBreak()] }),
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('9. Design System')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('9.1 Color Tokens (oklch)')] }),
            new Paragraph({ children: [new TextRun({ text: 'The design system uses semantic CSS custom properties in oklch color space for perceptually uniform theming. Light and dark modes are fully supported.', size: 22, font: 'Calibri' })] }),
            makeTable([
                [{text:'Token',header:true},{text:'Light Mode',header:true},{text:'Dark Mode',header:true},{text:'Purpose',header:true}],
                ['--primary','oklch(0.32 0.09 250) navy','oklch(0.72 0.14 195) teal','Buttons, active nav, accents'],
                ['--accent','oklch(0.72 0.14 195) teal','oklch(0.72 0.14 195) teal','Highlights, badges, links'],
                ['--background','oklch(0.99 0.005 240) near-white','oklch(0.14 0.03 250) dark navy','Page background'],
                ['--success','oklch(0.65 0.16 150) green','oklch(0.70 0.16 150) green','Resolved/verified states'],
                ['--warning','oklch(0.78 0.15 80) amber','oklch(0.80 0.15 80) amber','In-progress, caution states'],
                ['--destructive','oklch(0.58 0.22 27) red','oklch(0.65 0.22 27) red','Critical priority, errors'],
            ], [2000, 2200, 2200, 2960]),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('9.2 Status & Priority Visual Language')] }),
            makeTable([
                [{text:'Status',header:true},{text:'Color Style',header:true}],
                ['Submitted','bg-secondary (muted slate)'],
                ['Assigned','bg-accent/30 with accent border'],
                ['In Progress','bg-warning/20 with warning border'],
                ['Resolved','bg-success/20 with success border'],
                ['Verified','bg-success/30 with success border'],
                ['Closed','bg-muted (gray)'],
                ['Rejected','bg-destructive/15 with destructive border'],
            ], [2600, 6760]),
            makeTable([
                [{text:'Priority',header:true},{text:'Color Style',header:true}],
                ['Low','bg-muted text-muted-foreground (subtle)'],
                ['Medium','bg-warning/20 with warning border'],
                ['High','bg-destructive/15 with destructive border'],
                ['Critical','bg-destructive text-destructive-foreground (bold red)'],
            ], [2600, 6760]),
            new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: 'All badges use rounded-full pill styling with consistent padding (px-2.5 py-0.5) and uppercase tracking for priority.', size: 22, font: 'Calibri' })] }),

            // 10. ROADMAP
            new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('10. Future Roadmap')] }),
            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.1 Slice 2: Officer Dashboard')] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Officer assignment queue with priority sorting', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Status update workflow (assigned → in_progress → resolved)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Resolution photo/video upload and citizen verification', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Work-log comments per complaint', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Real-time notifications via Supabase Realtime', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.2 Slice 3: Admin & Analytics')] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Department-level SLA compliance dashboards', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Complaint category heatmaps and trend analysis', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Officer workload distribution and resolution time metrics', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Auto-escalation cron job for overdue complaints', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Bulk export (CSV/Excel) for municipal reporting', size: 22, font: 'Calibri' })] }),

            new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun('10.3 Advanced Features')] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'AI-powered resolution suggestions for officers (similar past complaints + best practices)', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Citizen satisfaction survey after resolution', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Push notifications (web push + email) for status changes', size: 22, font: 'Calibri' })] }),
            new Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Multi-language support for diverse citizen populations', size: 22, font: 'Calibri' })] }),
            new Paragraph({ spacing: { after: 200 }, numbering: { reference: 'bullets', level: 0 }, children: [new TextRun({ text: 'Integration with municipal GIS systems for advanced spatial analysis', size: 22, font: 'Calibri' })] }),

            // END
            new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— End of Document —', size: 22, color: '888888', font: 'Calibri' })] }),
        ]
    }]
});

Packer.toBuffer(doc).then(buffer => {
    fs.writeFileSync('/mnt/documents/CivicFlow_AI_Technical_Architecture.docx', buffer);
    console.log('Document written to /mnt/documents/CivicFlow_AI_Technical_Architecture.docx');
});
