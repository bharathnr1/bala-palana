-- Default lookups and settings (02-schema § Seeds), idempotent.
--
-- The inserts live in a function so a test can run it twice and prove that
-- nothing changes; the migration calls it once.

create or replace function seed_defaults()
returns void
language plpgsql
as $$
begin
  insert into lookup (kind, key, label, sort, meta) values
    -- Admission stages, in the requirements' wording.
    ('admission_status', 'application_received',      'Application received',      1, '{"terminal": false}'),
    ('admission_status', 'selected_for_interview',    'Selected for interview',    2, '{"terminal": false}'),
    ('admission_status', 'invited',                   'Invited',                   3, '{"terminal": false}'),
    ('admission_status', 'selected_as_student',       'Selected as student',       4, '{"terminal": true}'),
    ('admission_status', 'not_interested',            'Not interested',            5, '{"terminal": true}'),
    ('admission_status', 'not_eligible',              'Not eligible',              6, '{"terminal": true}'),
    ('admission_status', 'admission_not_taken',       'Admission not taken',       7, '{"terminal": true}'),
    ('admission_status', 'follow_up_later',           'Follow up later',           8, '{"terminal": false}'),

    ('admission_source', 'word_of_mouth',   'Word of mouth',           1, '{}'),
    ('admission_source', 'existing_family', 'Existing family',         2, '{}'),
    ('admission_source', 'alumna',          'Alumna',                  3, '{}'),
    ('admission_source', 'website_social',  'Website / social media',  4, '{}'),
    ('admission_source', 'event',           'Event',                   5, '{}'),
    ('admission_source', 'school_referral', 'School referral',         6, '{}'),
    ('admission_source', 'other',           'Other',                   7, '{}'),

    -- `meta` drives the entry form (D6): restricted visibility, follow-ups, details.
    ('entry_category', 'observation',         'Observation',         1, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'concern',             'Concern / needs help', 2, '{"restricted": false, "opens_follow_up": true}'),
    ('entry_category', 'corrective_action',   'Corrective action',   3, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'academic',            'Academic',            4, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'skill',               'Skill / talent',      5, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'achievement',         'Achievement',         6, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'responsibility',      'Responsibility',      7, '{"restricted": false, "opens_follow_up": false}'),
    ('entry_category', 'health',              'Health / well-being', 8, '{"restricted": true,  "opens_follow_up": false}'),
    ('entry_category', 'alumni_interaction',  'Alumni interaction',  9, '{"restricted": false, "opens_follow_up": false}'),

    ('tag', 'improving',       'Improving',       1,  '{}'),
    ('tag', 'excellent',       'Excellent',       2,  '{}'),
    ('tag', 'needs_help',      'Needs help',      3,  '{}'),
    ('tag', 'homework_done',   'Homework done',   4,  '{}'),
    ('tag', 'homework_pending','Homework pending',5,  '{}'),
    ('tag', 'participation',   'Participation',   6,  '{}'),
    ('tag', 'leadership',      'Leadership',      7,  '{}'),
    ('tag', 'kindness',        'Kindness',        8,  '{}'),
    ('tag', 'discipline',      'Discipline',      9,  '{}'),
    ('tag', 'punctuality',     'Punctuality',     10, '{}'),
    ('tag', 'confidence',      'Confidence',      11, '{}'),
    ('tag', 'wellbeing',       'Well-being',      12, '{}'),

    ('subject', 'english',              'English',              1,  '{"group": "language"}'),
    ('subject', 'hindi',                'Hindi',                2,  '{"group": "language"}'),
    ('subject', 'sanskrit',             'Sanskrit',             3,  '{"group": "language"}'),
    ('subject', 'mathematics',          'Mathematics',          4,  '{"group": "academic"}'),
    ('subject', 'science',              'Science',              5,  '{"group": "academic"}'),
    ('subject', 'social_studies',       'Social studies',       6,  '{"group": "academic"}'),
    ('subject', 'computer',             'Computer',             7,  '{"group": "academic"}'),
    ('subject', 'lalita_sahasranama',   'Lalita Sahasranama',   8,  '{"group": "stotra"}'),
    ('subject', 'vishnu_sahasranama',   'Vishnu Sahasranama',   9,  '{"group": "stotra"}'),
    ('subject', 'bhagavad_gita',        'Bhagavad Gita',        10, '{"group": "stotra"}'),

    ('term', 'term_1', 'Term 1', 1, '{}'),
    ('term', 'term_2', 'Term 2', 2, '{}'),
    ('term', 'annual', 'Annual', 3, '{}'),

    ('grade', 'grade_1',  'Grade 1',  1,  '{"order": 1}'),
    ('grade', 'grade_2',  'Grade 2',  2,  '{"order": 2}'),
    ('grade', 'grade_3',  'Grade 3',  3,  '{"order": 3}'),
    ('grade', 'grade_4',  'Grade 4',  4,  '{"order": 4}'),
    ('grade', 'grade_5',  'Grade 5',  5,  '{"order": 5}'),
    ('grade', 'grade_6',  'Grade 6',  6,  '{"order": 6}'),
    ('grade', 'grade_7',  'Grade 7',  7,  '{"order": 7}'),
    ('grade', 'grade_8',  'Grade 8',  8,  '{"order": 8}'),
    ('grade', 'grade_9',  'Grade 9',  9,  '{"order": 9}'),
    ('grade', 'grade_10', 'Grade 10', 10, '{"order": 10}'),
    ('grade', 'grade_11', 'Grade 11', 11, '{"order": 11}'),
    ('grade', 'grade_12', 'Grade 12', 12, '{"order": 12}'),

    ('duty', 'pooja',         'Pooja',         1, '{}'),
    ('duty', 'hall_cleaning', 'Hall cleaning', 2, '{}'),

    ('relation', 'mother',     'Mother',     1, '{}'),
    ('relation', 'father',     'Father',     2, '{}'),
    ('relation', 'guardian',   'Guardian',   3, '{}'),
    ('relation', 'grandparent','Grandparent',4, '{}'),
    ('relation', 'sibling',    'Sibling',    5, '{}'),
    ('relation', 'other',      'Other',      6, '{}'),

    ('document_kind', 'birth_certificate',    'Birth certificate',    1, '{"restricted": false}'),
    ('document_kind', 'aadhaar',               'Aadhaar',              2, '{"restricted": true}'),
    ('document_kind', 'transfer_certificate', 'Transfer certificate', 3, '{"restricted": false}'),
    ('document_kind', 'report_card',          'Report card',          4, '{"restricted": false}'),
    ('document_kind', 'medical',              'Medical',              5, '{"restricted": true}'),
    ('document_kind', 'certificate',          'Certificate',          6, '{"restricted": false}'),
    ('document_kind', 'photo',                'Photo',                7, '{"restricted": false}'),
    ('document_kind', 'other',                'Other',                8, '{"restricted": false}'),

    ('skill_area', 'music',    'Music',    1, '{}'),
    ('skill_area', 'dance',    'Dance',    2, '{}'),
    ('skill_area', 'art',      'Art',      3, '{}'),
    ('skill_area', 'sport',    'Sport',    4, '{}'),
    ('skill_area', 'chanting', 'Chanting', 5, '{}'),
    ('skill_area', 'speaking', 'Speaking', 6, '{}'),
    ('skill_area', 'writing',  'Writing',  7, '{}'),
    ('skill_area', 'crafts',   'Crafts',   8, '{}'),
    ('skill_area', 'other',    'Other',    9, '{}'),

    ('achievement_level', 'gurukula',     'Gurukula',     1, '{"order": 1}'),
    ('achievement_level', 'school',       'School',       2, '{"order": 2}'),
    ('achievement_level', 'inter_school', 'Inter-school', 3, '{"order": 3}'),
    ('achievement_level', 'district',     'District',     4, '{"order": 4}'),
    ('achievement_level', 'state',        'State',        5, '{"order": 5}'),
    ('achievement_level', 'national',     'National',     6, '{"order": 6}'),
    ('achievement_level', 'international','International',7, '{"order": 7}'),

    ('achievement_result', 'participated',    'Participated',     1, '{"order": 1}'),
    ('achievement_result', 'special_mention', 'Special mention',  2, '{"order": 2}'),
    ('achievement_result', 'third',           'Third',            3, '{"order": 3}'),
    ('achievement_result', 'second',          'Second',           4, '{"order": 4}'),
    ('achievement_result', 'first',           'First',            5, '{"order": 5}'),
    ('achievement_result', 'winner',          'Winner',           6, '{"order": 6}'),

    ('payment_mode', 'cash',          'Cash',          1, '{}'),
    ('payment_mode', 'upi',           'UPI',           2, '{}'),
    ('payment_mode', 'bank_transfer', 'Bank transfer', 3, '{}'),
    ('payment_mode', 'cheque',        'Cheque',        4, '{}'),

    ('alumni_contact_mode', 'call',    'Call',    1, '{}'),
    ('alumni_contact_mode', 'visit',   'Visit',   2, '{}'),
    ('alumni_contact_mode', 'event',   'Event',   3, '{}'),
    ('alumni_contact_mode', 'message', 'Message', 4, '{}')
  on conflict (kind, key) do nothing;

  insert into setting (key, value) values
    ('academic_year_start_month', '6'),
    ('cycle_rule', '{"type": "half_month"}'),
    ('needs_attention_days', '30'),
    ('feedback_audio_retention_days', '90')
  on conflict (key) do nothing;
end;
$$;

select seed_defaults();
