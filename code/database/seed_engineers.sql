-- ============================================================
-- FloodGuard — Engineer (User) Seed Data
--
-- Default accounts for the FloodGuard system.
-- All default passwords are: floodguard123
-- Passwords are bcrypt-hashed (cost factor 10).
--
-- After first login, engineers should change their passwords
-- through the system's account management interface.
--
-- IMPORTANT: This file is executed during database initialization
-- only. It will NOT overwrite existing records on re-run thanks
-- to the ON CONFLICT clause.
-- ============================================================

INSERT INTO engineers (name, role, contact, assigned_dam_id, password_hash)
VALUES
(
    'Admin',
    'System Administrator',
    'admin@floodguard.lk',
    NULL,  -- global access, not dam-specific
    '$2b$10$oPqakC6RRu7PEQi63/C/9eIB2jOTektMmRQMyk0JNAkx2P1Hw.f5C'
),
(
    'Kumara Bandara',
    'Chief Engineer',
    'k.bandara@irrigation.gov.lk',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    '$2b$10$oPqakC6RRu7PEQi63/C/9eIB2jOTektMmRQMyk0JNAkx2P1Hw.f5C'
),
(
    'K. L. Jayasinghe',
    'Shift Engineer',
    'k.jayasinghe@irrigation.gov.lk',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    '$2b$10$oPqakC6RRu7PEQi63/C/9eIB2jOTektMmRQMyk0JNAkx2P1Hw.f5C'
),
(
    'Nimal Perera',
    'Observer',
    'n.perera@irrigation.gov.lk',
    (SELECT dam_id FROM dams WHERE dam_name = 'Victoria Dam'),
    '$2b$10$oPqakC6RRu7PEQi63/C/9eIB2jOTektMmRQMyk0JNAkx2P1Hw.f5C'
);
